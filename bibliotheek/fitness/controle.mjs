// Geometriecontroles op het model, gedeeld door de test en de werkplaats: botsingen tussen gedraaide balken (OBB,
// scheidende-as-stelling), zwevende onderdelen, de kabelloop (in het vlak van elke katrol, niet door profielen) en
// bereikbaarheid (zithoogtes, grepen, schijfhouders vrij). Node en browser.
import { sub, dot, cross, len, norm, aabb, contact, add, mul } from './model.mjs';

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
/** paren die mogen raken of overlappen: gelast, 'in' elkaar, of in dezelfde lasgroep met een las */
function vrijgesteld(o) {
  const vrij = new Set(), k = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  for (const l of o.lassen) vrij.add(k(l.a, l.b));
  return (a, b) => vrij.has(k(a.id, b.id)) || a.in === b.id || b.in === a.id || (a.in && a.in !== true && !String(a.in).startsWith('d')) || (b.in && b.in !== true && !String(b.in).startsWith('d'));
}
/** alle botsingen tussen stalen delen en kussens (krimp 1 mm): [{ a, b }] */
export function botsingen(o, krimp = 1) {
  const items = [...o.delen.filter((d) => d.kleur !== 'kap'), ...o.kussens], vrij = vrijgesteld(o), uit = [];
  const B = items.map((d) => d.geo.map((g) => obb(g, krimp)));
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    if (vrij(items[i], items[j])) continue;
    const [a0, a1] = aabb(items[i].geo[0]), [b0, b1] = aabb(items[j].geo[0]);
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
      const as = g.as === 'v' ? d.v : d.w, p = add(d.a, mul(d.u, g.s)), half = (g.as === 'v' ? d.P.b : d.P.h) / 2;
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
      if (d.soort === 'staaf' && (d.P.vorm === 'buis') && Math.abs(dot(d.u, f.as)) > 0.98 && afstandTotLijn(d.a, f.p, f.as) <= d.P.b / 2 - d.P.t - f.d / 2 + 0.5) continue; // door de boring van een buis
      if (d.soort === 'staaf' && d.in && Math.abs(dot(d.u, f.as)) > 0.98) continue; // de as zelf
      const gat = G.find((g) => g.deel === d && Math.abs(dot(g.as, f.as)) > 0.98 && afstandTotLijn(g.p, f.p, f.as) <= 0.5);
      if (!gat) { uit.push(`${f.soort} ${f.naam} (Ø${f.d}) gaat door ${d.naam} zonder gat`); continue; }
      const [lo, hi] = SPELING[f.soort], sp = gat.d - (f.soort === 'lager' ? f.lager : f.d);
      if (sp < lo - 1e-6 || sp > hi + 1e-6) uit.push(`${f.soort} ${f.naam}: gat Ø${gat.d} in ${d.naam} past niet bij Ø${f.soort === 'lager' ? `${f.lager} (lager)` : f.d} (speling ${sp.toFixed(1)}, ${lo}-${hi})`);
    }
  }
  for (const g of G) {
    const d = g.deel;
    if (d.soort === 'staaf') {
      if (/Stapelstang/.test(d.naam)) continue; // selectiegaten: geen dragende verbinding
      const L = d.L, s = g.g.s, e = 1.5 * g.d;
      if (s < e - 0.5 || L - s < e - 0.5) uit.push(`${d.naam}: gat Ø${g.d} op ${Math.round(s)} mm, randafstand < 1,5 x Ø (${Math.round(e)})`);
      if (d.P.vorm === 'koker') {
        const w = g.g.as === 'v' ? d.P.h : d.P.b, r = 2 * d.P.t;
        if (g.d / 2 > w / 2 - r + 0.01) uit.push(`${d.naam}: gat Ø${g.d} valt in de hoekradius (vlak ${Math.round(w - 2 * r)} mm)`);
        else if (w / 2 < e - 0.5) uit.push(`${d.naam}: gat Ø${g.d} te dicht bij de zijkant (${w / 2} < ${Math.round(e)})`);
      }
    } else {
      const e = 1.5 * g.d, x = g.g.x, y = g.g.y;
      if (d.rond) { if (Math.hypot(x - d.l / 2, y - d.bmaat / 2) > d.l / 2 - e + 0.5 && Math.hypot(x - d.l / 2, y - d.bmaat / 2) > 1) uit.push(`${d.naam}: gat Ø${g.d} te dicht bij de rand`); }
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
