// Geometriecontroles op het model, gedeeld door de test en de werkplaats: botsingen tussen gedraaide balken (OBB,
// scheidende-as-stelling), zwevende onderdelen, de kabelloop (in het vlak van elke katrol, niet door profielen) en
// bereikbaarheid (zithoogtes, grepen, schijfhouders vrij). Node en browser.
import { terugVouwen } from './vorm.mjs';
import { sub, dot, cross, len, norm, aabb, contact, add, mul, doosVan, balk } from './model.mjs';
import { puntOp, randAfstand, binnen } from './vorm.mjs';

/** OBB van een balk: midden, assen, halve maten (een ronde balk iets kleiner: ingeschreven) */
export function obb(g, krimp = 0) {
  const c = mul(add(g.a, g.b), 0.5), L = len(sub(g.b, g.a)), k = g.rond ? 0.86 : 1;
  return { c, as: [g.u, g.v, g.w], h: [Math.max(0, L / 2 - krimp), Math.max(0, (g.bw * k) / 2 - krimp), Math.max(0, (g.bh * k) / 2 - krimp)] };
}
/** botsen twee OBB's? (15 assen) */
export function botsen(A, B) {
  const T = sub(B.c, A.c), assen = [...A.as, ...B.as];
  for (const a of A.as) for (const b of B.as) { const x = cross(a, b); if (len(x) > 1e-6) assen.push(norm(x)); }
  for (const s of assen) {
    const ra = A.as.reduce((t, a, i) => t + A.h[i] * Math.abs(dot(a, s)), 0), rb = B.as.reduce((t, b, i) => t + B.h[i] * Math.abs(dot(b, s)), 0);
    if (Math.abs(dot(T, s)) > ra + rb) return false;
  }
  return true;
}
/** paren die mogen raken of overlappen: gelast, 'in' elkaar (id, of een naamdeel: 'as' = alleen delen met 'as' in de
 *  naam), of een ronde staaf (as, pen, stang) die door een gat van het andere stuk gaat (zelfde as, Ø past) */
function vrijgesteld(o) {
  const vrij = new Set(), k = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  for (const l of o.lassen) vrij.add(k(l.a, l.b));
  const G = gaten(o);
  const doorGat = (a, b) => a.soort === 'staaf' && a.P?.vorm === 'rond' && G.some((g) => g.deel === b && g.d >= a.P.b - 0.5 && Math.abs(dot(g.as, a.u)) > 0.98 && len(sub(sub(g.p, a.a), mul(a.u, dot(sub(g.p, a.a), a.u)))) < 1);
  const naamIn = (a, b) => typeof a.in === 'string' && !a.in.startsWith('d') && b.naam.toLowerCase().includes(a.in.toLowerCase());
  // v7: twee vlakken van dezelfde gezette plaat zijn één stuk (de zetting verbindt ze)
  return (a, b) => (a.deelVan && a.deelVan === b.deelVan) || vrij.has(k(a.id, b.id)) || a.in === b.id || b.in === a.id || naamIn(a, b) || naamIn(b, a) || doorGat(a, b) || doorGat(b, a);
}
/** alle botsingen tussen stalen delen en kussens (krimp 1 mm): [{ a, b }] */
export function botsingen(o, krimp = 1) {
  const items = [...o.delen.filter((d) => d.kleur !== 'kap'), ...o.kussens], vrij = vrijgesteld(o), uit = [];
  const B = items.map((d) => d.geo.map((g) => obb(g, krimp))), D = items.map((d) => (d.geo.length > 1 ? doosVan(d.geo) : aabb(d.geo[0])));
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    if (vrij(items[i], items[j])) continue;
    const [a0, a1] = D[i], [b0, b1] = D[j];
    if ([0, 1, 2].some((x) => a0[x] > b1[x] + 1 || b0[x] > a1[x] + 1)) continue;
    if (B[i].some((p) => B[j].some((q) => botsen(p, q)))) uit.push({ a: items[i].naam, b: items[j].naam, ga: items[i].groep, gb: items[j].groep });
  }
  return uit;
}
/** schijven (voorbeeld) die door het frame gaan: niet bereikbaar */
export function schijvenVrij(o) {
  const staal = o.delen.filter((d) => d.kleur !== 'kap'), uit = [];
  for (const s of o.toon.filter((g) => g.kleur === 'schijf')) {
    const S = obb(s, 2);
    for (const d of staal) if (!/Schijfhouder|Kraag|Laadpen/.test(d.naam) && d.geo.some((g) => botsen(S, obb(g, 1)))) uit.push(d.naam);
  }
  return [...new Set(uit)];
}
/** zwevende groepen: niets raakt de vloer, de muur of het rack */
export function zwevend(o) {
  const items = [...o.delen.map((d) => ({ n: d.naam, geo: d.geo })), ...o.kussens.map((d) => ({ n: d.naam, geo: d.geo })), ...o.koop.filter((k) => k.geo.length).map((k) => ({ n: k.naam, geo: k.geo }))];
  const n = items.length, ouder = items.map((_, i) => i), vind = (i) => (ouder[i] === i ? i : (ouder[i] = vind(ouder[i])));
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (items[i].geo.some((g) => items[j].geo.some((h) => contact(g, h, 1.5)))) ouder[vind(i)] = vind(j);
  const anker = (geo) => geo.some((g) => { const [mn, mx] = aabb(g); return mn[2] <= 15 || (o.muur != null && mx[1] >= o.muur - 2) || (o.context ?? []).some((c) => contact(g, c, 2)); });
  const gr = new Map(); for (let i = 0; i < n; i++) { const r = vind(i); if (!gr.has(r)) gr.set(r, []); gr.get(r).push(i); }
  return [...gr.values()].filter((g) => !g.some((i) => anker(items[i].geo))).map((g) => g.map((i) => items[i].n));
}
/** de kabelloop: elke katrol in zijn vlak, geen kabelstuk door een stalen deel (tenzij door een kabelgat) */
export function kabelFouten(o) {
  const uit = [], staal = o.delen.filter((d) => d.kleur !== 'kap' && !d.stapel && !/Katrolbeugel|Vingerbescherming|Rugplaat katrol|Nok/.test(d.naam));
  for (const kb of o.kabels) {
    for (let i = 1; i < kb.route.length - 1; i++) {
      const p = kb.route[i]; if (!p.katrol) continue;
      const d1 = norm(sub(p.in, kb.route[i - 1].uit ?? kb.route[i - 1].p)), d2 = norm(sub(kb.route[i + 1].in ?? kb.route[i + 1].p, p.uit));
      const as = p.k.as, s = Math.max(Math.abs(dot(d1, as)), Math.abs(dot(d2, as)));
      if (s > 0.2) uit.push(`${kb.naam}: katrol ${p.label} staat scheef op de kabel (${Math.round(Math.asin(Math.min(1, s)) * 57.3)}°)`);
      const beugels = o.delen.filter((d) => d.naam === `Katrolbeugel ${p.label}`).length;
      if (beugels < 2 && !/los/.test(p.label)) uit.push(`${kb.naam}: katrol ${p.label} heeft geen beugel aan twee kanten`);
    }
    for (let i = 1; i < kb.lijn.length; i++) {
      const a = kb.lijn[i - 1], b = kb.lijn[i], L = len(sub(b, a)); if (L < 20) continue;
      const k0 = i === 1 ? 40 : 8, k1 = i === kb.lijn.length - 1 ? 40 : 8; // het oog en de greep zelf niet
      const g = { a: add(a, mul(norm(sub(b, a)), k0)), b: sub(b, mul(norm(sub(b, a)), k1)), u: norm(sub(b, a)), v: [0, 0, 0], w: [0, 0, 0], bw: kb.d, bh: kb.d, rond: true };
      const vv = Math.abs(g.u[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1]; g.v = norm(sub(vv, mul(g.u, dot(vv, g.u)))); g.w = cross(g.u, g.v);
      const K = obb(g, 0);
      for (const d of staal) {
        if (!d.geo.some((h) => botsen(K, obb(h, 1.5)))) continue;
        const gat = (d.gaten ?? []).some((gt) => gt.d >= 15 && (gt.p ? len(sub(gt.p, a)) < 2000 : true));
        if (!gat) uit.push(`${kb.naam}: kabel loopt door ${d.naam}`);
      }
    }
  }
  return [...new Set(uit)];
}
/** bereikbaarheid voor een gebruiker van 1,60 tot 1,95 m: zithoogte, kussenhoogte, grepen, schijfhouders */
export function ergonomie(o) {
  const uit = [];
  for (const k of o.kussens) {
    const top = Math.max(k.a[2], k.b[2]) + k.dikte * Math.max(0, k.n[2]);
    if (/Zitting/.test(k.naam) && (top < 380 || top > 600)) uit.push(`${k.naam} op ${Math.round(top)} mm (380-600)`);
    if (/^Kussen$/.test(k.naam) && Math.abs(k.n[2]) > 0.99 && (top < 400 || top > 480)) uit.push(`bankkussen op ${Math.round(top)} mm (400-480)`);
  }
  for (const d of o.delen) {
    if (d.naam === 'Schijfhouder') { const z = Math.max(d.a[2], d.b[2]); if (z > 1800) uit.push(`schijfhouder op ${Math.round(z)} mm (te hoog)`); }
    if (d.soort === 'staaf' && /Greep|Handgreep|Optrekstang|Dipstang/.test(d.naam)) { const z = (d.a[2] + d.b[2]) / 2; if (z < 250 || z > 2450) uit.push(`${d.naam} op ${Math.round(z)} mm`); }
  }
  return uit;
}

// ---------------------------------------------------------------- gaten
/** alle gaten in wereldcoördinaten: [{ deel, p (hart), as, d, door, punten (waar het gat de wanden doorboort), g }] */
export function gaten(o) {
  const uit = [];
  for (const d of o.delen) {
    if (d.soort === 'staaf') for (const g of d.gaten) {
      const fr = d.pad ? puntOp(d, g.s) : { p: add(d.a, mul(d.u, g.s)), v: d.v, w: d.w };
      const as = g.as === 'v' ? fr.v : fr.w, p = fr.p, half = ((g.as === 'v') !== !!d.staand ? d.P.b : d.P.h) / 2;
      uit.push({ deel: d, p, as, d: g.d, door: g.door ?? 2, punten: [add(p, mul(as, half)), add(p, mul(as, -half))], g });
    } else for (const g of d.gaten) {
      const as = [0, 0, 0]; as[d.as.t] = 1; const p = [...g.p]; p[d.as.t] = (d.mn[d.as.t] + d.mx[d.as.t]) / 2;
      uit.push({ deel: d, p, as, d: g.d, door: 1, punten: [add(p, mul(as, d.t / 2)), add(p, mul(as, -d.t / 2))], g });
    }
  }
  return uit;
}
/** snijdt het lijnstuk a-b de OBB? */
function lijnDoorObb(a, b, B) {
  const da = sub(a, B.c), db = sub(b, B.c);
  let t0 = 0, t1 = 1;
  for (let i = 0; i < 3; i++) {
    const pa = dot(da, B.as[i]), pb = dot(db, B.as[i]), dd = pb - pa, h = B.h[i];
    if (Math.abs(dd) < 1e-9) { if (Math.abs(pa) > h) return false; continue; }
    let ta = (-h - pa) / dd, tb = (h - pa) / dd; if (ta > tb) [ta, tb] = [tb, ta];
    t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); if (t0 > t1) return false;
  }
  return true;
}
const afstandTotLijn = (p, a, u) => len(sub(sub(p, a), mul(u, dot(sub(p, a), u))));
/** ISO 273: speling voor bouten (fijn tot grof), pennen +0,5..+2 mm, lagerzittingen tot +10 mm */
export const SPELING = { bout: [0.4, 2.6], pen: [0.4, 2.1], lager: [-0.1, 0.5] };
/** steek tussen boutgaten in hetzelfde stuk: p ≥ 2,2·d0 (EN 1993-1-8 tabel 3.3; Westside-pengaten vallen erbuiten: AANNAME) */
export function steekFouten(o) {
  const G = gaten(o), uit = [], par = (a, b) => Math.abs(dot(a, b)) > 0.98;
  const boutGat = (g) => o.bouten.some((bt) => bt.key !== 'anker' && par(bt.as, g.as) && (bt.punten ?? [bt.p]).some((q) => afstandTotLijn(g.p, q, bt.as) < 1));
  const per = new Map(); for (const g of G) if (boutGat(g)) { if (!per.has(g.deel)) per.set(g.deel, []); per.get(g.deel).push(g); }
  for (const [deel, l] of per) for (let i = 0; i < l.length; i++) for (let j = i + 1; j < l.length; j++) { if (!par(l[i].as, l[j].as)) continue; const s = len(sub(l[i].p, l[j].p)), p = 2.2 * Math.max(l[i].d, l[j].d); if (s > 1 && s < p) uit.push(`${deel.naam}: boutgaten Ø${l[i].d} op ${Math.round(s)} mm < 2,2·d0 = ${Math.round(p)} mm`); }
  return [...new Set(uit)];
}
/** alle gatfouten: bout of pen zonder gat of met een verkeerd gat, randafstand, hoekradius, gat tegen gat, gat in een las */
export function gatFouten(o) {
  const uit = [], G = gaten(o), staal = o.delen.filter((d) => d.kleur !== 'kap');
  const bevestiging = [
    ...o.bouten.flatMap((bt) => (bt.punten ?? [bt.p]).map((p) => ({ naam: bt.naam, p, as: bt.as, d: bt.M, L: bt.lengte ?? 100, soort: 'bout' }))),
    ...o.pennen.map((pn) => ({ naam: pn.naam, p: pn.p, as: pn.as, d: pn.d, L: pn.lengte ?? 110, soort: pn.lager ? 'lager' : 'pen', lager: pn.lager, gelast: pn.gelast })),
  ];
  for (const f of bevestiging) {
    const a = add(f.p, mul(f.as, -f.L / 2 + 1)), b = add(f.p, mul(f.as, f.L / 2 - 1));
    for (const d of staal) {
      if (d.stapel || d.naam === f.gelast) continue;
      if (!d.geo.some((g) => lijnDoorObb(a, b, obb(g, 0.5)))) continue;
      if (d.soort === 'staaf' && (d.P.vorm === 'buis') && Math.abs(dot(d.u, f.as)) > 0.98 && afstandTotLijn(d.a, f.p, f.as) <= (d.boring ?? d.P.b - 2 * d.P.t) / 2 - f.d / 2 + 0.5) continue; // door de boring van een buis (uitgedraaid: boring)
      if (d.soort === 'staaf' && d.in && Math.abs(dot(d.u, f.as)) > 0.98) continue; // de as zelf
      const gat = G.find((g) => g.deel === d && Math.abs(dot(g.as, f.as)) > 0.98 && afstandTotLijn(g.p, f.p, f.as) <= 0.5);
      if (!gat) { uit.push(`${f.soort} ${f.naam} (Ø${f.d}) gaat door ${d.naam} zonder gat`); continue; }
      const zit = f.soort === 'lager' ? (/Lageroor|Lagerhuis/.test(d.naam) ? 'lager' : 'pen') : f.soort; // de lagerzitting zit alleen in het oor of het lagerhuis
      const [lo, hi] = SPELING[zit], sp = gat.d - (zit === 'lager' ? f.lager : f.d);
      if (sp < lo - 1e-6 || sp > hi + 1e-6) uit.push(`${zit} ${f.naam}: gat Ø${gat.d} in ${d.naam} past niet bij Ø${zit === 'lager' ? `${f.lager} (lager)` : f.d} (speling ${sp.toFixed(1)}, ${lo}-${hi})`);
    }
  }
  for (const g of G) {
    const d = g.deel;
    if (d.soort === 'staaf') {
      if (/Stapelstang/.test(d.naam)) continue; // selectiegaten: geen dragende verbinding
      const L = d.L, s = g.g.s, e = 1.5 * g.d;
      if (s < e - 0.5 || L - s < e - 0.5) uit.push(`${d.naam}: gat Ø${g.d} op ${Math.round(s)} mm, randafstand < 1,5 x Ø (${Math.round(e)})`);
      if (d.P.vorm === 'koker') {
        const w = g.g.as === 'v' ? d.P.h : d.P.b, r = d.P.ovaal ? Math.min(d.P.b, d.P.h) / 2 : 2 * d.P.t;
        if (g.d / 2 > w / 2 - r + 0.01) uit.push(`${d.naam}: gat Ø${g.d} valt in de hoekradius (vlak ${Math.round(w - 2 * r)} mm)`);
        else if (w / 2 < e - 0.5) uit.push(`${d.naam}: gat Ø${g.d} te dicht bij de zijkant (${w / 2} < ${Math.round(e)})`);
      }
    } else {
      if (g.g.zitting) continue; // v7: boring voor een lager of een geklemde stang (geen boutverbinding): alleen het ligament telt
      const e = 1.5 * g.d, x = g.g.x, y = g.g.y;
      if (d.rond) { if (Math.hypot(x - d.l / 2, y - d.bmaat / 2) > d.l / 2 - e + 0.5 && Math.hypot(x - d.l / 2, y - d.bmaat / 2) > 1) uit.push(`${d.naam}: gat Ø${g.d} te dicht bij de rand`); }
      else if (d.contour) { const q = [g.g.lx, g.g.ly], m = Math.min(binnen(q, d.contour.punten) ? randAfstand(q, d.contour.punten) : -1, ...d.contour.uitsparingen.map((u) => (binnen(q, u.punten) ? -1 : randAfstand(q, u.punten)))); if (m < e - 0.5) uit.push(`${d.naam}: gat Ø${g.d} randafstand ${Math.round(m)} < 1,5 x Ø (${Math.round(e)}) tot de contour`); }
      else if (Math.min(x, d.l - x, y, d.bmaat - y) < e - 0.5) uit.push(`${d.naam}: gat Ø${g.d} randafstand ${Math.round(Math.min(x, d.l - x, y, d.bmaat - y))} < 1,5 x Ø (${Math.round(e)})`);
    }
  }
  // gat tegen gat op hetzelfde stuk (ligament ≥ 6 mm)
  const per = new Map(); for (const g of G) { if (!per.has(g.deel)) per.set(g.deel, []); per.get(g.deel).push(g); }
  for (const [d, lijst] of per) {
    if (/Stapelstang/.test(d.naam)) continue;
    for (let i = 0; i < lijst.length; i++) for (let j = i + 1; j < lijst.length; j++) {
      const A = lijst[i], B = lijst[j], afst = d.soort === 'staaf' ? Math.abs(A.g.s - B.g.s) : Math.hypot(A.g.x - B.g.x, A.g.y - B.g.y);
      if (d.soort === 'staaf' && A.g.as === B.g.as && afst < 0.5) { uit.push(`${d.naam}: dubbel gat op ${Math.round(A.g.s)}`); continue; }
      if (afst < (A.d + B.d) / 2 + 6 - 0.01) uit.push(`${d.naam}: gaten Ø${A.d} en Ø${B.d} te dicht bij elkaar (${afst.toFixed(1)} mm)`);
    }
  }
  // gat in een las
  for (const l of o.lassen) {
    const [a0, a1] = aabb(l.A.geo[0]), [b0, b1] = aabb(l.B.geo[0]), m = l.keel + 3;
    const c0 = [0, 1, 2].map((i) => Math.max(a0[i], b0[i])), c1 = [0, 1, 2].map((i) => Math.min(a1[i], b1[i]));
    const z0 = c0.map((v) => v - m), z1 = c1.map((v) => v + m), dun = [0, 1, 2].map((i) => c1[i] - c0[i] < 2 * m + 1);
    // de las loopt langs de rand van het raakvlak: een band van m breed; binnen het raakvlak mag een gat
    const inBand = (p) => [0, 1, 2].every((i) => p[i] > z0[i] && p[i] < z1[i]) && [0, 1, 2].some((i) => !dun[i] && (p[i] < c0[i] + m || p[i] > c1[i] - m));
    for (const g of G) {
      if (g.deel !== l.A && g.deel !== l.B) continue;
      if (/Stapelstang/.test(g.deel.naam)) continue;
      if (![l.A, l.B].every((x) => [x.geo[0].u, x.geo[0].v].every((q) => Math.max(...q.map(Math.abs)) > 0.9999))) continue; // schuin gedraaid: de lasband als doos is te grof (in stand 0 nagekeken)
      const ander = g.deel === l.A ? l.B : l.A;
      if (ander.soort === 'staaf' && Math.abs(dot(ander.u, g.as)) > 0.98 && afstandTotLijn(g.p, ander.a, ander.u) < 1) continue; // het gat is de zitting van het gelaste stuk
      const wand = g.deel.soort === 'plaat' ? [g.p] : g.punten;
      if (wand.some(inBand)) uit.push(`${g.deel.naam}: gat Ø${g.d} ligt in de las met ${(g.deel === l.A ? l.B : l.A).naam}`);
    }
  }
  return [...new Set(uit)];
}

/**
 * Westside-gaten die niet kunnen (in een lasband, te dicht bij een ander gat of bij het uiteinde) weglaten. De rij
 * wordt daar onderbroken; de weggelaten posities staan in o.weggelaten (met de reden) en op het stukblad.
 */
export function snoeiWestside(o) {
  const weg = [], lijnen = [...o.bouten.flatMap((bt) => (bt.punten ?? [bt.p]).map((p) => ({ p, as: bt.as }))), ...o.pennen.map((pn) => ({ p: pn.p, as: pn.as }))];
  for (const d of o.delen.filter((x) => x.soort === 'staaf' && x.westside)) {
    const isWs = (g) => g.as === 'w' && g.d === d.westside.d;
    const gebruikt = (g) => { const p = add(d.a, mul(d.u, g.s)); return lijnen.some((l) => afstandTotLijn(p, l.p, l.as) < 1 && Math.abs(dot(l.as, d.w)) > 0.98); };
    const banden = o.lassen.filter((l) => l.A === d || l.B === d).map((l) => { const [a0, a1] = aabb(l.A.geo[0]), [b0, b1] = aabb(l.B.geo[0]), m = l.keel + 3 + 2; return [[0, 1, 2].map((i) => Math.max(a0[i], b0[i]) - m), [0, 1, 2].map((i) => Math.min(a1[i], b1[i]) + m)]; });
    const blijf = [];
    for (const g of d.gaten) {
      if (!isWs(g) || gebruikt(g)) { blijf.push(g); continue; }
      const p = add(d.a, mul(d.u, g.s)), half = d.P.h / 2, wand = [add(p, mul(d.w, half)), add(p, mul(d.w, -half))];
      let reden = '';
      if (g.s < 1.5 * g.d || d.L - g.s < 1.5 * g.d) reden = 'te dicht bij het uiteinde';
      else if (banden.some(([z0, z1]) => wand.some((q) => [0, 1, 2].every((i) => q[i] > z0[i] - g.d / 2 && q[i] < z1[i] + g.d / 2)))) reden = 'in de las';
      else if (d.gaten.some((h) => h !== g && !isWs(h) && Math.abs(h.s - g.s) < (h.d + g.d) / 2 + 6)) reden = 'tegen een boutgat';
      if (reden) weg.push({ deel: d.naam, s: g.s, d: g.d, reden }); else blijf.push(g);
    }
    d.gaten = blijf;
  }
  o.weggelaten = weg;
  return weg;
}

// ---------------------------------------------------------------- knelpunten
const BEWEEGT = /^(Hefboom|Slede|Stang smith)/;
/** afstand van een punt tot een OBB */
function puntObb(p, B) { const d = sub(p, B.c); let s = 0; for (let i = 0; i < 3; i++) { const t = Math.abs(dot(d, B.as[i])) - B.h[i]; if (t > 0) s += t * t; } return Math.sqrt(s); }
/** de hoekpunten en ribmiddens van een OBB */
function punten(B) {
  const uit = [];
  for (const a of [-1, 0, 1]) for (const b of [-1, 0, 1]) for (const c of [-1, 0, 1]) if (a || b || c) uit.push(add(add(add(B.c, mul(B.as[0], a * B.h[0])), mul(B.as[1], b * B.h[1])), mul(B.as[2], c * B.h[2])));
  return uit;
}
/** kleinste vrije afstand tussen elk bewegend stalen deel en het vaste frame in deze stand: [{ a, b, mm }] (benadering:
 *  hoek- en ribpunten van de ene doos tot de andere doos, in beide richtingen) */
export function knelAfstanden(o) {
  const staal = o.delen.filter((d) => d.kleur !== 'kap'), los = staal.filter((d) => BEWEEGT.test(d.groep)), vast = staal.filter((d) => !BEWEEGT.test(d.groep)), vrij = vrijgesteld(o), uit = [];
  for (const a of los) {
    let best = null;
    for (const A of a.geo.map((g) => obb(g))) for (const b of vast) {
      if (vrij(a, b)) continue;
      for (const B of b.geo.map((g) => obb(g))) {
        if (len(sub(A.c, B.c)) > Math.hypot(...A.h) + Math.hypot(...B.h) + 30) continue;
        const mm = Math.min(...punten(A).map((p) => puntObb(p, B)), ...punten(B).map((p) => puntObb(p, A)));
        if (!best || mm < best.mm) best = { a: a.naam, b: b.naam, mm };
      }
    }
    if (best && best.mm < 60) uit.push(best);
  }
  return uit;
}

// ---------------------------------------------------------------- boutlengte en afstandsbussen
/** klemlengte van een bout op punt p: de som van de stukken staal die de boutlijn kruist (koker = buitenmaat) */
export function klemLengte(o, bt, p) {
  const L = bt.lengte ?? 100, a = add(p, mul(bt.as, -L / 2)), b = add(p, mul(bt.as, L / 2)), d = sub(b, a);
  let klem = 0; const kokers = [];
  for (const deel of o.delen) {
    if (deel.kleur === 'kap' || deel.stapel) continue;
    for (const g of deel.geo) {
      const B = obb(g, 0), da = sub(a, B.c); let t0 = 0, t1 = 1, ok = true;
      for (let i = 0; i < 3 && ok; i++) { const pa = dot(da, B.as[i]), dd = dot(d, B.as[i]), h = B.h[i]; if (Math.abs(dd) < 1e-9) { if (Math.abs(pa) > h) ok = false; continue; } let ta = (-h - pa) / dd, tb = (h - pa) / dd; if (ta > tb) [ta, tb] = [tb, ta]; t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); if (t0 > t1) ok = false; }
      if (ok && t1 > t0) { klem += (t1 - t0) * L; if (deel.soort === 'staaf' && deel.P.vorm === 'koker') kokers.push(deel.naam); }
    }
  }
  return { klem: Math.round(klem), kokers };
}
export const BOUTLENGTES = [40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 180, 200, 220, 240, 260, 280, 300];
/** de handelslengte van een bout: klemlengte + 2 ringen + borgmoer + 2 gangen, naar boven afgerond */
export function boutLengte(M, klem) {
  const nodig = klem + 2 * (M >= 16 ? 3 : 2.5) + (M >= 16 ? 16 : 12) + 2 * (M >= 16 ? 2 : 1.75);
  return { nodig: Math.round(nodig), L: BOUTLENGTES.find((x) => x >= nodig) ?? Math.ceil(nodig / 20) * 20 };
}

// ---------------------------------------------------------------- functiecontroles (Fable 5.2, P1)
/** P1-01/03: een losse haak (J-cup, spotterarm) heeft een pen door BEIDE wanden en wangen langs de staander */
export function haakFouten(o) {
  const uit = [];
  for (const p of o.pennen.filter((q) => /^J-hook|^Spotterarm/.test(q.naam))) {
    if (p.snedes < 2) uit.push(`${p.naam}: pen door één wand (moment niet opgenomen)`);
    const groep = p.b, wangen = o.delen.filter((d) => d.groep === groep && /wang/i.test(d.naam));
    if (wangen.length < 2) uit.push(`${p.naam}: geen U-beugel (wangen) rond de staander`);
    if (/^Spotterarm/.test(p.naam) && !o.delen.some((d) => d.groep === groep && /Haaklip/.test(d.naam))) uit.push(`${p.naam}: geen haaklip achter de staander`);
  }
  return [...new Set(uit)];
}
/** P1-02: een los stuk dat tussen twee staanders van één gelast frame zit, mag niet met twee pennen naar buiten in
 *  beide staanders steken (dan kan het er niet in): pennen van één groep op één lijn in tegengestelde richting */
export function monteerFouten(o) {
  const uit = [];
  for (const g of new Set(o.delen.map((d) => d.groep))) {
    const pinnen = o.delen.filter((d) => d.groep === g && d.soort === 'staaf' && d.P.vorm === 'rond' && typeof d.in === 'string' && d.in.startsWith('d'));
    for (let i = 0; i < pinnen.length; i++) for (let j = i + 1; j < pinnen.length; j++) {
      const a = pinnen[i], b = pinnen[j];
      if (Math.abs(dot(a.u, b.u)) < 0.98 || afstandTotLijn(b.a, a.a, a.u) > 1 || a.in === b.in) continue;
      const m = mul(add(add(a.a, a.b), add(b.a, b.b)), 0.25), wegA = dot(sub(mul(add(a.a, a.b), 0.5), m), a.u), wegB = dot(sub(mul(add(b.a, b.b), 0.5), m), a.u);
      if (wegA * wegB < 0) uit.push(`${g}: ${a.naam} en ${b.naam} steken naar buiten in twee staanders van één gelast frame: niet te monteren`);
    }
  }
  return [...new Set(uit)];
}
/** P1-07: elk veiligheidsonderdeel dat in de tekst staat, bestaat in het model */
export function veiligheidFouten(o) {
  const tekst = (o.veiligheid ?? '').toLowerCase(), uit = [], naam = (re) => o.delen.some((d) => re.test(d.naam)) || o.koop.some((k) => re.test(k.naam));
  const eis = [['grendel', /Grendelstrip/], ['grendel', /Grendelpal/], ['hendel', /Handgreep grendel/], ['eindstop', /Eindstop/], ['stopring', /Stopring/], ['haak', /Haak/], ['buffer', /buffer/i]];
  for (const [woord, re] of eis) if (tekst.includes(woord) && !naam(re)) uit.push(`'${woord}' staat in de tekst maar niet in het model`);
  return uit;
}
/** P1-08: elke haak van de smithstang ligt op een haakpen (as onder de haak, binnen de haakbreedte) */
export function smithHaakFouten(o) {
  const haken = o.delen.filter((d) => /^Haak smith/.test(d.naam)), pennen = o.delen.filter((d) => d.naam === 'Haakpen'), uit = [];
  for (const h of haken) {
    const [mn, mx] = aabb(h.geo[0]);
    const ok = pennen.some((p) => { const [pm, pM] = aabb(p.geo[0]), r = p.P.b / 2; return pm[0] <= mx[0] && pM[0] >= mn[0] && (pm[1] + pM[1]) / 2 >= mn[1] && (pm[1] + pM[1]) / 2 <= mx[1] && Math.abs(mn[2] - (pM[2])) <= 2 && r > 0; });
    if (!ok) uit.push(`${h.naam}: ligt op geen haakpen`);
  }
  return uit;
}
/** P1-09: de schijven van een toestel met een platform staan niet boven het platform (niet tussen de benen) */
export function schijvenOpPlatform(o) {
  const pf = o.delen.filter((d) => d.naam === 'Platform');
  if (!pf.length) return [];
  const uit = [];
  for (const s of o.toon.filter((g) => g.kleur === 'schijf')) { const c = mul(add(s.a, s.b), 0.5); if (pf.some((p) => c[0] >= p.mn[0] && c[0] <= p.mx[0] && c[1] >= p.mn[1] && c[1] <= p.mx[1])) uit.push(`schijf op (${Math.round(c[0])}, ${Math.round(c[1])}) staat boven het platform`); }
  return uit;
}
/** P1-11: elke hefboom heeft een as als staaf (stuklijst), een begin- en eindaanslag en stelringen */
export function hefboomFouten(o) {
  const uit = [];
  for (const g of new Set(o.delen.filter((d) => /^Draaibus/.test(d.naam) && o.delen.some((q) => q.groep === d.groep && /^Hefboomarm/.test(q.naam))).map((d) => d.groep))) {
    const n = g.toLowerCase();
    if (!o.delen.some((d) => d.naam === `As ${n}`)) uit.push(`${g}: de as staat niet als staaf in het model (niet in de stuklijst)`);
    if (!o.delen.some((d) => d.naam === `Aanslag begin ${n}`) || !o.delen.some((d) => d.naam === `Aanslag einde ${n}`)) uit.push(`${g}: geen begin- of eindaanslag`);
    if (!o.koop.some((k) => /Stelring/.test(k.naam) && k.naam.includes(n))) uit.push(`${g}: geen asborging (stelringen)`);
  }
  return uit;
}

/** P2-08c: rond de kop en de moer van elke bout is ruimte voor de sleutel (cilinder r 14/17 mm, 25/30 mm lang buiten het
 *  geklemde pakket); als doos benaderd, getoetst tegen elk stalen deel */
export function sleutelFouten(o) {
  const uit = [], staal = o.delen.filter((d) => d.kleur !== 'kap' && !d.stapel);
  for (const bt of o.bouten) {
    if (bt.key === 'anker' || !bt.M) continue;
    const r = bt.M >= 16 ? 17 : 14, h = bt.M >= 16 ? 30 : 25, ax = norm(bt.as), v = Math.abs(ax[2]) < 0.9 ? norm(cross(ax, [0, 0, 1])) : [1, 0, 0], w = cross(ax, v);
    for (const p of bt.punten ?? [bt.p]) {
      const L = bt.lengte ?? 100, a = add(p, mul(ax, -L / 2)), d = mul(ax, L);
      let t0 = Infinity, t1 = -Infinity;
      const door = [];
      for (const deel of staal) for (const g of deel.geo) { const B = obb(g, 0), da = sub(a, B.c); let lo = 0, hi = 1, ok = true; for (let i = 0; i < 3 && ok; i++) { const pa = dot(da, B.as[i]), dd = dot(d, B.as[i]), hh = B.h[i]; if (Math.abs(dd) < 1e-9) { if (Math.abs(pa) > hh) ok = false; continue; } let ta = (-hh - pa) / dd, tb = (hh - pa) / dd; if (ta > tb) [ta, tb] = [tb, ta]; lo = Math.max(lo, ta); hi = Math.min(hi, tb); if (lo > hi) ok = false; } if (ok && hi > lo) { t0 = Math.min(t0, lo * L); t1 = Math.max(t1, hi * L); door.push(deel); } }
      if (!isFinite(t0)) continue;
      for (const [s0, s1, kant] of [[t1 + 0.5, t1 + h, 'moer'], [t0 - h, t0 - 0.5, 'kop']]) {
        const c = add(a, mul(ax, (s0 + s1) / 2)), K = { c, as: [ax, v, w], h: [(s1 - s0) / 2, r, r] };
        for (const deel of staal) if (!door.includes(deel) && deel.geo.some((g) => botsen(K, obb(g, 1)))) uit.push(`${bt.naam}: geen ruimte voor de sleutel aan de ${kant}kant (${deel.naam})`);
      }
    }
  }
  return [...new Set(uit)];
}
/** P2-08d: gaten in gezette (geplooide) platen liggen buiten de plooizone: ≥ 3·t + d/2 van de rand */
export function gezetFouten(o) {
  const uit = [];
  for (const d of o.delen.filter((x) => x.soort === 'plaat' && /gezet|geplooid|omgezet/i.test(x.opm ?? ''))) for (const g of d.gaten) { const m = Math.min(g.x, d.l - g.x, g.y, d.bmaat - g.y), nodig = 3 * d.t + g.d / 2; if (m < nodig) uit.push(`${d.naam}: gat Ø${g.d} op ${Math.round(m)} mm van de rand: in de plooizone (≥ ${Math.round(nodig)})`); }
  return uit;
}

/** v6 P1-01..03: een kabel die op een nok eindigt wikkelt op (raakpunt en vloerkatrol aan de kant waar de nok naartoe
 *  draait), de kabellengte is gelijk in stand 0 en stand 1 (± 2 mm), de stapel stijgt R·θ, en de kracht aan de greep
 *  haalt de grens van de oefening. o = stand 0, o1 = stand 1 (optioneel). */
export function nokFouten(o, o1 = null) {
  const uit = [], n = o.nok;
  for (const k of o.kabels.filter((x) => x.einde === 'nok')) {
    if (!n) continue; // nok op een staande as (pec deck): geen kantelende hefboom
    const yk = n.as[0], pf = k.route[k.route.length - 2], raak = k.raak ?? k.route[k.route.length - 1].p;
    if (Math.sign(raak[1] - yk) !== n.zin) uit.push(`${k.naam}: de nok draait van het raakpunt weg (de kabel wikkelt af en valt slap)`);
    // N-P1-05 v7: de vloerkatrol ligt aan de KABELKANT: tussen het raakpunt en de vorige katrol (de binnenhoek van de kabel),
    // en de kabel loopt verticaal van haar raakpunt naar de nok
    const vorige = k.route[k.route.length - 3];
    if (pf?.p && vorige?.p && Math.sign(pf.p[1] - raak[1]) !== Math.sign(vorige.p[1] - raak[1])) uit.push(`${k.naam}: de vloerkatrol ligt aan de buitenkant van de kabelhoek (de kabel raakt haar niet)`);
    if (pf?.katrol && Math.abs(Math.abs(pf.p[1] - raak[1]) - pf.r) > 2) uit.push(`${k.naam}: de kabel van de vloerkatrol naar de nok is niet verticaal (${Math.round(Math.abs(pf.p[1] - raak[1]) - pf.r)} mm)`);
    if (Math.abs(n.slag - (n.factor ?? 1) * n.Rn * n.thMax) > 2) uit.push(`${k.naam}: stapelweg ${n.slag} mm ≠ ${(n.factor ?? 1) > 1 ? `${n.factor}·` : ''}R·θ = ${Math.round((n.factor ?? 1) * n.Rn * n.thMax)} mm`);
    // alle kabels en riemen van het toestel: even lang in stand 0 en 1 (ook de stapelkabel over de 2:1-takel)
    if (o1) for (const k0 of o.kabels) { const k1 = o1.kabels.find((x) => x.naam === k0.naam); if (k1 && Math.abs(k1.L - k0.L) > 2) uit.push(`${k0.naam}: kabellengte ${Math.round(k0.L)} → ${Math.round(k1.L)} mm tussen stand 0 en 1 (geen gesloten loop)`); }
    if (n.Rn > 220) uit.push(`${k.naam}: nok R${n.Rn} > 220 mm (merken: R ± 100-220)`);
    if (n.grens && n.kracht < n.grens) uit.push(`${k.naam}: ${Math.round(n.kracht)} kg aan de greep < grens ${Math.round(n.grens)} kg (${n.oef})`);
  }
  return uit;
}

/** v6 P1-10: thermisch verzinken: elke holle ruimte (buis, koker) heeft minstens 2 openingen (open uiteinden of
 *  ontluchtingsgaten ≥ Ø8), anders barst ze open in het zinkbad (EN ISO 1461, EN ISO 14713-2) */
export function ontluchtFouten(o) {
  if (!o.verzinkt) return [];
  const uit = [];
  for (const d of o.delen) {
    if (d.soort !== 'staaf' || !['buis', 'koker'].includes(d.P?.vorm)) continue;
    const open = (d.kappen ?? []).filter(Boolean).length, gaten = d.gaten.filter((g) => g.d >= 8).length;
    if (open + gaten < 2) uit.push(`${d.naam}: ${open} open uiteinde(n) en ${gaten} gat(en) ≥ Ø8: niet te verzinken (ontluchting)`);
  }
  return [...new Set(uit)];
}

/** v6 P1-04: een lagerhuis moet uit te draaien zijn tot de boring: binnendiameter ≤ boring − 1,5 mm, boring > as */
export function lagerhuisFouten(o) {
  const uit = [];
  for (const d of o.delen.filter((x) => x.naam === 'Lagerhuis' && x.boring)) {
    const di = d.P.b - 2 * d.P.t;
    if (di > d.boring - 1.5) uit.push(`${d.naam}: binnen Ø${di.toFixed(1)} is niet uit te draaien tot Ø${d.boring} H7 (te weinig materiaal)`);
  }
  return [...new Set(uit)];
}
/** v6 P1-06: een schijf (gat Ø50,4, Ø450) moet van het vrije uiteinde over elke laadpen tot aan de kraag kunnen: niets vast
 *  (niet .los) in de cilinder Ø52 voorbij de punt, en niets dan de pen zelf in de schijfzone Ø450 langs de pen */
export function laadpenFouten(o) {
  const uit = [];
  for (const p of o.delen.filter((d) => d.naam === 'Laadpen')) {
    const u = p.u, punt = p.b, voorbij = obb(balk(punt, add(punt, mul(u, 300)), p.v, 52, 52, true), 0), zone = obb(balk(add(p.a, mul(u, 2)), punt, p.v, 450, 450, true), 0);
    for (const d of o.delen) {
      if (d === p || d.los || d.in === p.id || /^Kraag/.test(d.naam)) continue;
      if (d.geo.some((g) => botsen(voorbij, obb(g, 0.5)))) uit.push(`${p.naam} (${p.groep}): ${d.naam} zit voor de punt: een schijf kan er niet op`);
      else if (Math.abs(d.u?.[0] * u[0] + d.u?.[1] * u[1] + d.u?.[2] * u[2]) < 0.99 && d.geo.some((g) => botsen(zone, obb(g, 1)) && aabb(g)[1][2] > 15)) uit.push(`${p.naam} (${p.groep}): ${d.naam} zit in de weg van een schijf Ø450`);
    }
  }
  return [...new Set(uit)];
}
/** v6 P1-09: een paal in de grond zit ≥ 600 mm in een betonpoer, met de bovenkant van de poer ≥ 200 mm onder het maaiveld */
export function inbedFouten(o) {
  const uit = [], poeren = (o.context ?? []).filter((g) => g.kleur === 'beton').map((g) => { const [mn, mx] = aabb(g); return { mn, mx }; });
  for (const d of o.delen.filter((x) => x.soort === 'staaf' && Math.min(...x.geo.map((g) => aabb(g)[0][2])) < -100)) {
    const zb = Math.min(...d.geo.map((g) => aabb(g)[0][2])), q = d.geo.find((g) => aabb(g)[0][2] <= zb + 1), c = q ? mul(add(q.a, q.b), 0.5) : d.a;
    const p = poeren.find((x) => c[0] >= x.mn[0] - 1 && c[0] <= x.mx[0] + 1 && c[1] >= x.mn[1] - 1 && c[1] <= x.mx[1] + 1);
    if (!p) { uit.push(`${d.naam}: in de grond zonder poer`); continue; }
    const inbed = p.mx[2] - zb;
    if (inbed < 600) uit.push(`${d.naam}: ${Math.round(inbed)} mm ingegoten (< 600)`);
    if (p.mx[2] > -200) uit.push(`${d.naam}: bovenkant poer op ${Math.round(p.mx[2])} mm (minstens 200 mm onder het maaiveld)`);
  }
  return [...new Set(uit)];
}
/** v6 P1-11: elke plaat die gezet is (opmerking 'gezet'/'zetting'), staat in de stuklijst als uitslag met zetlijnen */
export function uitslagFouten(o) {
  const uit = [];
  for (const d of o.delen) if (d.soort === 'plaat' && !d.deelVan && /gezet|zetting|omgezet|plooi/i.test(d.opm ?? '') && !/geen omgezette|niet gezet/i.test(d.opm ?? '')) uit.push(`${d.naam}: gezet volgens de opmerking, maar de DXF is geen uitslag (geen zetlijnen)`);
  for (const g of o.gezet ?? []) if (!g.zetlijnen?.length) uit.push(`${g.naam}: gezette plaat zonder zetlijnen`);
  // N-P1-07 v7: de uitslag terugvouwen = de buitenmaten van de 3D (± 1 mm); een uitslag past op een plaat 3000 x 1500;
  // elke hoek van de 3D is een zetting (of een naad): een mantel met een hoek zonder zetting sluit niet
  for (const g of o.gezet ?? []) {
    if (g.strook && g.maat3d) { const tv = terugVouwen(g.strook, g.t); g.maat3d.forEach((m, i) => { if (m != null && Math.abs(tv[i] - m) > 1) uit.push(`${g.naam}: uitslag teruggevouwen geeft been ${i + 1} = ${tv[i].toFixed(1)} mm, de 3D ${m.toFixed(1)} mm`); }); }
    const kort = Math.min(g.l, g.bmaat), lang = Math.max(g.l, g.bmaat);
    if (kort > 1500 || lang > 3000) uit.push(`${g.naam}: uitslag ${Math.round(g.l)} x ${Math.round(g.bmaat)} past niet op een plaat 3000 x 1500 (splitsen)`);
    if (g.hoeken != null && g.zetlijnen.length < g.hoeken) uit.push(`${g.naam}: ${g.hoeken} hoeken in de 3D maar ${g.zetlijnen.length} zettingen (de naad sluit niet)`);
  }
  return [...new Set(uit)];
}

/** N-P1-02 v7: elke inlopende kneep (kabel op een nok of katrol) onder 1,8 m ligt in een gesloten kap, en geen opening
 *  > 8 mm ligt binnen 120 mm van zo'n kneep (EN ISO 20957-1 §5.3, EN ISO 13857 tabel 4: vingers tot 8 mm) */
export function kapFouten(o) {
  const uit = [], kappen = o.kappen ?? [];
  const inPoly = (q, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [yi, zi] = P[i], [yj, zj] = P[j]; if (zi > q[1] !== zj > q[1] && q[0] < ((yj - yi) * (q[1] - zi)) / (zj - zi) + yi) c = !c; } return c; };
  const binnenKap = (p, k) => (k.box ? [0, 1, 2].every((i) => p[i] >= k.box[0][i] - 0.5 && p[i] <= k.box[1][i] + 0.5) : p[0] >= k.x[0] - 0.5 && p[0] <= k.x[1] + 0.5 && inPoly([p[1], p[2]], k.poly));
  const afstBox = (p, bx) => Math.hypot(...[0, 1, 2].map((i) => Math.max(bx[0][i] - p[i], 0, p[i] - bx[1][i])));
  for (const kn of o.knepen ?? []) {
    if (kn.p[2] >= 1800) continue;
    const in_ = kappen.filter((k) => k.gesloten && binnenKap(kn.p, k));
    if (!in_.length) { uit.push(`inlopende kneep "${kn.naam}" op ${Math.round(kn.p[2])} mm ligt niet in een gesloten kap`); continue; }
    for (const k of kappen) for (const op of k.openingen ?? []) {
      if (op.mm <= 8) continue;
      const d = op.box ? afstBox(kn.p, op.box) : len(sub(kn.p, op.p));
      if (d < 120) uit.push(`opening "${op.wat}" (${Math.round(op.mm)} mm) op ${Math.round(d)} mm van de kneep "${kn.naam}" (< 120 mm)`);
    }
  }
  return [...new Set(uit)];
}
/** N-P1-04 v7: de aanslagen werken: in stand 0 rust de stopkant van de nok tegen de aanslagbout (≤ 2 mm, niet erdoor), in
 *  stand 1 raakt de lagerbus van de stapel de bovenbuffer (≤ 2 mm); de arm hangt via de veerpen aan de as (o.pennen) */
export function aanslagFouten(o0, o1) {
  const uit = [], a = o0.aanslag; if (!a) return uit;
  const nok = o0.delen.find((d) => d.id === a.nok);
  if (!nok) return ['geen nok gevonden voor de aanslag'];
  // afstand van het centrum van de bout tot de rand van de nok (in het vlak van de nok), min de straal van de huls
  const c = nok.contour, P = c.punten.map(([x, y]) => add(add(c.o, mul(c.ex, x)), mul(c.ey, y)));
  let dmin = Infinity;
  for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length], v = sub(q, p), tt = Math.max(0, Math.min(1, dot(sub(a.begin.p, p), v) / dot(v, v))), h = add(p, mul(v, tt)), dd = Math.hypot(h[1] - a.begin.p[1], h[2] - a.begin.p[2]); dmin = Math.min(dmin, dd); }
  const spel = dmin - a.begin.r;
  if (spel > 2) uit.push(`stand 0: de stopkant van de nok ligt ${spel.toFixed(1)} mm van de aanslagbout (> 2 mm)`);
  if (spel < -0.5) uit.push(`stand 0: de nok gaat ${(-spel).toFixed(1)} mm door de aanslagbout`);
  if (o1) {
    const lb = o1.delen.filter((d) => d.naam === 'Lagerbus stapel'), top = lb.length ? Math.max(...lb.map((d) => Math.max(...d.geo.flatMap((g) => [g.a[2], g.b[2]])))) : null, z = o1.aanslag?.einde?.z;
    if (top == null || z == null) uit.push('stand 1: geen lagerbus of bovenbuffer gevonden');
    else if (Math.abs(z - top) > 2) uit.push(`stand 1: de lagerbus van de stapel staat ${Math.round(z - top)} mm van de bovenbuffer (> 2 mm)`);
  }
  if (!(o0.pennen ?? []).some((p) => /Veerpen startstand/.test(p.naam))) uit.push('geen veerpen tussen de arm en de instelschijf: de startstand is niet in te stellen');
  return uit;
}

/** N-P1-06 v7: materiaalcombinatie: in een verzinkt toestel wordt geen RVS aan staal gelast (RVS gaat niet mee in het
 *  zinkbad: zink op de greep, risico op scheuren door vloeibaar metaal) en raakt RVS het zink niet zonder isolatie */
export function materiaalFouten(o) {
  if (!o.verzinkt) return [];
  const uit = [], rvs = (d) => /RVS|1\.4404|1\.4301/.test(d?.P?.naam ?? d?.P?.norm ?? '') || /rvs$/.test(d?.P?.id ?? '');
  const per = new Map(o.delen.map((d) => [d.id, d]));
  for (const l of o.lassen) { const A = per.get(l.a), B = per.get(l.b); if (A && B && rvs(A) !== rvs(B)) uit.push(`${rvs(A) ? A.naam : B.naam} (RVS) is gelast aan ${rvs(A) ? B.naam : A.naam} (verzinkt staal): RVS gaat niet mee in het zinkbad`); }
  for (const d of o.delen) if (rvs(d) && !d.rvsLos) uit.push(`${d.naam}: RVS-deel in een verzinkt toestel zonder losse montage (bus + isolatiehuls)`);
  return [...new Set(uit)];
}
