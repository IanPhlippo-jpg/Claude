// Detailblad A4 liggend per onderdeel (positie uit de stuklijst): het hele stuk op schaal met alle maten, beide
// uiteinden vergroot (hoek, lengte van de lange en de korte kant), de doorsnede, gaten, waar het stuk in de deur zit en
// met welke stukken het verbonden wordt. En de 3D-vorm van het stuk (holle koker met verstek, platstaal, rond, boog,
// plaat met gaten, glas) als prisma's, zonder three: de pagina bouwt er de 3D mee, de test rekent het volume na.
// Projectie volgens ISO 5456-2 (eerste hoek), maten ISO 129-1, arcering ISO 128-50. Werkt in Node en in de browser.
import { veelhoek, MATEN } from './deuren.mjs';
import { vooraanzicht, band } from './teken.mjs';
import { STAAF } from './prijzen.mjs';
import { GLAS } from './opties.mjs';
import { verbindingen, verbindingVan } from './explode.mjs';
import { sectie, tekenSectie } from './profielen.mjs';
/** welke rol (kozijn, kader, roede, glaslat) dit profiel in de deur heeft */
const rolVan = (o, prof) => (!o ? null : prof === o.sys.kozijn.staaf ? 'kozijn' : prof === o.sys.kader.staaf ? 'kader' : prof === o.sys.roede.staaf ? 'roede' : prof === o.sys.glaslat.staaf ? 'glaslat' : null);
import { esc, g } from './blad.mjs';

export const W4 = 297, H4 = 210;
const f = (v) => (Math.round(v * 100) / 100).toString();
const T = (x, y, t, h = 2.5, o = {}) => `<text x="${f(x)}" y="${f(y)}" font-size="${h}"${o.anker ? ` text-anchor="${o.anker}"` : ''}${o.vet ? ' font-weight="700"' : ''}${o.kleur ? ` fill="${o.kleur}"` : ''}${o.rot ? ` transform="rotate(${f(o.rot)} ${f(x)} ${f(y)})"` : ''}>${esc(t)}</text>`;
const L = (x1, y1, x2, y2, w = 0.25, extra = '') => `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="#111" stroke-width="${w}"${extra}/>`;
const VERBORGEN = ' stroke-dasharray="1.6 0.8"', HART = ' stroke-dasharray="6 1 1 1"';
const poly = (pts, vul = '#d7dadc', sw = 0.35) => `<polygon points="${pts.map(([x, y]) => `${f(x)},${f(y)}`).join(' ')}" fill="${vul}" stroke="#111" stroke-width="${sw}" stroke-linejoin="round"/>`;
const ARCERING = '<defs><pattern id="arcering" width="1.6" height="1.6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="1.6" height="1.6" fill="#fff"/><line x1="0" y1="0" x2="0" y2="1.6" stroke="#111" stroke-width="0.18"/></pattern></defs>';

/** de grootste normschaal (ISO 5455) die past: s = mm op papier per mm echt */
const NORM = [5, 2, 1, 1 / 2, 1 / 5, 1 / 10, 1 / 20, 1 / 50];
const schaal = (max) => NORM.find((s) => s <= max + 1e-9) ?? 1 / 100;
const schaalTekst = (s) => (s >= 1 ? `${s}:1` : `1:${Math.round(1 / s)}`);

/** maatlijn van A naar B, evenwijdig op afstand off (positief = links van A->B); hulplijnen vanaf de punten (ISO 129-1) */
export function maat(ax, ay, bx, by, off, tekst, h = 2.5) {
  const l = Math.hypot(bx - ax, by - ay) || 1, d = [(bx - ax) / l, (by - ay) / l], n = [d[1], -d[0]], s = Math.sign(off) || 1;
  const A = [ax + n[0] * off, ay + n[1] * off], B = [bx + n[0] * off, by + n[1] * off], el = [];
  el.push(L(ax + n[0] * s * 1, ay + n[1] * s * 1, A[0] + n[0] * s * 1.5, A[1] + n[1] * s * 1.5, 0.18), L(bx + n[0] * s * 1, by + n[1] * s * 1, B[0] + n[0] * s * 1.5, B[1] + n[1] * s * 1.5, 0.18), L(A[0], A[1], B[0], B[1], 0.18));
  const pijl = (p, r) => `<polygon points="${f(p[0])},${f(p[1])} ${f(p[0] + r[0] * 2.5 + n[0] * 0.55)},${f(p[1] + r[1] * 2.5 + n[1] * 0.55)} ${f(p[0] + r[0] * 2.5 - n[0] * 0.55)},${f(p[1] + r[1] * 2.5 - n[1] * 0.55)}" fill="#111"/>`;
  // korte maat: pijlen buiten, van buiten naar de hulplijn
  if (l < 7) el.push(pijl(A, [-d[0], -d[1]]), pijl(B, d), L(A[0] - d[0] * 4, A[1] - d[1] * 4, A[0], A[1], 0.18), L(B[0], B[1], B[0] + d[0] * 4, B[1] + d[1] * 4, 0.18));
  else el.push(pijl(A, d), pijl(B, [-d[0], -d[1]]));
  // tekst evenwijdig aan de maatlijn, leesbaar van onder of van rechts
  let a = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
  if (a > 90.5) a -= 180; else if (a <= -89.5) a += 180;
  const up = [Math.sin((a * Math.PI) / 180), -Math.cos((a * Math.PI) / 180)], mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2;
  const kant = up[0] * n[0] * s + up[1] * n[1] * s >= 0 ? 0.9 : -(0.9 + h * 0.75);
  const tx = l < 7 ? B[0] + d[0] * 5 : mx, ty = l < 7 ? B[1] + d[1] * 5 : my;
  el.push(T(tx + up[0] * kant, ty + up[1] * kant, tekst, h, { anker: l < 7 ? (d[0] >= 0 ? 'start' : 'end') : 'middle', rot: a }));
  return el.join('');
}
/** hoekmaat: boog met straal r rond c van hoek t0 tot t1 (radialen, schermassen), tekst in het midden */
function hoekMaat(cx, cy, r, t0, t1, tekst, h = 2.5) {
  const P = (t, rr = r) => [cx + rr * Math.cos(t), cy + rr * Math.sin(t)], a = P(t0), b = P(t1), groot = Math.abs(t1 - t0) > Math.PI ? 1 : 0, sw = t1 > t0 ? 1 : 0;
  const el = [`<path d="M${f(a[0])},${f(a[1])} A${f(r)},${f(r)} 0 ${groot} ${sw} ${f(b[0])},${f(b[1])}" fill="none" stroke="#111" stroke-width="0.18"/>`];
  const pijl = (t, z) => { const p = P(t), tg = [-Math.sin(t) * z, Math.cos(t) * z], nn = [Math.cos(t), Math.sin(t)]; return `<polygon points="${f(p[0])},${f(p[1])} ${f(p[0] + tg[0] * 2.2 + nn[0] * 0.5)},${f(p[1] + tg[1] * 2.2 + nn[1] * 0.5)} ${f(p[0] + tg[0] * 2.2 - nn[0] * 0.5)},${f(p[1] + tg[1] * 2.2 - nn[1] * 0.5)}" fill="#111"/>`; };
  const z = t1 > t0 ? 1 : -1;
  if (r * Math.abs(t1 - t0) > 6) el.push(pijl(t0, z), pijl(t1, -z));
  const m = P((t0 + t1) / 2, r + 1.2 + h * 0.4);
  el.push(T(m[0], m[1] + h * 0.35, tekst, h, { anker: Math.cos((t0 + t1) / 2) > 0.3 ? 'start' : Math.cos((t0 + t1) / 2) < -0.3 ? 'end' : 'middle' }));
  return el.join('');
}

/** een veelhoek knippen op u0 <= u <= u1 (as 0) of v0 <= v <= v1 (as 1); Sutherland-Hodgman */
export function knip(p, as, a0, a1) {
  const een = (pts, keep, grens) => { const uit = []; pts.forEach((a, i) => { const b = pts[(i + 1) % pts.length], ia = keep(a), ib = keep(b); if (ia) uit.push(a); if (ia !== ib) { const t = (grens - a[as]) / (b[as] - a[as]), q = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]; q[as] = grens; uit.push(q); } }); return uit; };
  return een(een(p, (q) => q[as] >= a0 - 1e-9, a0), (q) => q[as] <= a1 + 1e-9, a1);
}
const oppervlak = (p) => Math.abs(p.reduce((s, a, i) => { const b = p[(i + 1) % p.length]; return s + a[0] * b[1] - b[0] * a[1]; }, 0)) / 2;
/** waar de lijn v = c de veelhoek snijdt: [umin, umax] of null */
function snijU(p, c) {
  const us = [];
  p.forEach((a, i) => { const b = p[(i + 1) % p.length]; if ((a[1] - c) * (b[1] - c) <= 0 && a[1] !== b[1]) us.push(a[0] + ((c - a[1]) / (b[1] - a[1])) * (b[0] - a[0])); });
  return us.length >= 2 ? [Math.min(...us), Math.max(...us)] : null;
}
/** koker AxBxT, platstaal AxB, rond ØD uit de naam van de staaf; diepte = de maat die niet in zicht is */
export function profiel(prof, V) {
  const st = STAAF[prof], n = st?.naam ?? prof;
  let m;
  // koopprofiel: hol met wand 1,5 (vereenvoudigd: zonder sponning), eventueel met een isolatiezone; een glaslat als strip
  if (st?.koop) return st.diepte ? { soort: 'koker', koop: true, naam: n, zicht: V, diepte: st.diepte, t: st.wand ?? 1.5, iso: st.iso } : { soort: 'plat', koop: true, naam: n, zicht: V, diepte: 4 };
  if ((m = n.match(/koker (\d+)x(\d+)x(\d+)/))) { const [a, b, t] = m.slice(1).map(Number); return { soort: 'koker', naam: n, zicht: V, diepte: Math.abs(a - V) < 0.6 ? b : a, t }; }
  if ((m = n.match(/platstaal (\d+)x(\d+)/))) { const [a, b] = m.slice(1).map(Number); return { soort: 'plat', naam: n, zicht: V, diepte: Math.abs(a - V) < 0.6 ? b : a }; }
  if ((m = n.match(/hoeklijn (\d+)x(\d+)x(\d+)/))) { const [a, b, t] = m.slice(1).map(Number); return { soort: 'hoek', naam: n, zicht: V, diepte: b, t, been: a }; }
  if ((m = n.match(/rond Ø(\d+)/))) return { soort: 'rond', naam: n, d: +m[1], zicht: +m[1], diepte: +m[1] };
  return { soort: 'systeem', naam: n, zicht: V, diepte: 50 };
}

// ---------------------------------------------------------------- 3D-vorm
/** de 3D-vorm van een positie: { delen: [{ pts, gaten: [[x, y, r]], z0, z1, glas? }], cilinder?: { L, r, gaten } } in mm */
export function vorm3d(p, o) {
  const v = vorm3dKaal(p, o);
  return p.gaten?.length && v.delen?.length ? metGaten(v, p) : v;
}
/** de gaten van de stuklijst in de wanden: voor/achter in de voor- en achterwand (Shape-gaten), een zijgat in de zijwand
 *  (die wand dan als plaat in het u-z-vlak, dik over v: as 'v'); verz = verzinkingen om als kegel te tekenen */
function metGaten(v, p) {
  const V = p.vorm.V, delen = v.delen.map((d) => ({ ...d, gaten: [...d.gaten] })), zMax = Math.max(...delen.map((d) => d.z1)), verz = [];
  const r = (b) => (b.draad ? ({ M4: 3.3, M5: 4.2, M6: 5, M8: 6.8 })[b.draad] : b.d) / 2;
  for (const b of p.gaten) {
    if (b.rechthoek) continue;
    if (b.vlak === 'voor' || b.vlak === 'achter') {
      const doel = delen.filter((d) => d.as !== 'v' && d.pts.length >= 3 && ((b.vlak === 'voor' || b.door === 2) && d.z0 < 0.01 || (b.vlak === 'achter' || b.door === 2) && d.z1 > zMax - 0.01));
      for (const d of doel) if (binnenVeelhoek(d.pts, b.u, b.v)) d.gaten.push([b.u, b.v, r(b)]);
      if (b.verz) verz.push({ u: b.u, v: b.v, R: b.verz / 2, r: r(b), vlak: b.vlak === 'achter' ? 'z+' : 'z-', a: b.vlak === 'achter' ? zMax : 0 });
      continue;
    }
    // zijgat (en een gat in het been van een hoeklijn): de wanden die op die v-hoogte liggen en de diepte z bevatten
    const zz = b.vlak === 'been' ? b.v : b.z, vv = b.vlak === 'been' ? 0 : b.v;
    for (let i = 0; i < delen.length; i++) {
      const d = delen[i];
      if (d.as === 'v') { if (zz > d.pts[0][1] && zz < d.pts[2][1] && b.u > d.pts[0][0] && b.u < d.pts[1][0]) d.gaten.push([b.u, zz, r(b)]); continue; }
      const vs = d.pts.map((q) => q[1]), v0 = Math.min(...vs), v1 = Math.max(...vs);
      const raakt = b.vlak === 'been' ? v0 < 0.01 && v1 < 5 : (b.door === 2 || typeof b.door === 'string' || b.d2) ? v1 - v0 < 5 : Math.abs(vv - v0) < 0.6 || Math.abs(vv - v1) < 0.6;
      if (!raakt || v1 - v0 > 5 || zz <= d.z0 || zz >= d.z1) continue;
      const us = d.pts.map((q) => q[0]);
      delen[i] = { pts: [[Math.min(...us), d.z0], [Math.max(...us), d.z0], [Math.max(...us), d.z1], [Math.min(...us), d.z1]], gaten: [[b.u, zz, b.d2 && Math.abs(v0) > 0.1 ? b.d2 / 2 : r(b)]], z0: v0, z1: v1, as: 'v', iso: d.iso };
    }
    if (b.verz) verz.push({ u: b.u, v: zz, R: b.verz / 2, r: r(b), vlak: Math.abs(vv) < 0.6 ? 'v-' : 'v+', a: Math.abs(vv) < 0.6 ? 0 : V });
  }
  return { ...v, delen, verz };
}
function binnenVeelhoek(pts, x, y) { let b = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], c = pts[j]; if ((a[1] > y) !== (c[1] > y) && x < ((c[0] - a[0]) * (y - a[1])) / (c[1] - a[1]) + a[0]) b = !b; } return b; }
function vorm3dKaal(p, o) {
  // een koopprofiel: de wanden van de doorsnede (sponning, isolatie) over de lengte, met de echte uiteinden (verstek)
  const rol = p.soort === 'staaf' ? rolVan(o, p.prof) : null;
  if (rol && STAAF[p.prof]?.koop && rol !== 'glaslat') {
    const sec = sectie(o, rol), { pts, V } = p.vorm, k = V / sec.V;
    return { profiel: { ...profiel(p.prof, V), naam: sec.naam }, delen: sec.wanden.map((w) => ({ pts: knip(pts, 1, w.v0 * k, w.v1 * k), gaten: [], z0: w.z0, z1: w.z1, iso: !!w.iso })).filter((x) => x.pts.length > 2) };
  }
  // L-profiel (aluminium glaslat): het korte been over het glas, het lange tegen de koker
  if (p.soort === 'staaf' && STAAF[p.prof]?.L) { const [la, , lt] = STAAF[p.prof].L, { pts } = p.vorm; return { profiel: { soort: 'hoek', naam: STAAF[p.prof].naam, zicht: p.vorm.V, diepte: la, t: lt }, delen: [{ pts, gaten: [], z0: 0, z1: lt }, { pts: knip(pts, 1, 0, lt), gaten: [], z0: lt, z1: la }] }; }
  if (p.soort === 'staaf') {
    const { pts, V } = p.vorm, pr = profiel(p.prof, V);
    if (pr.soort === 'rond') return { delen: [], cilinder: { L: p.vorm.L, r: pr.d / 2, gaten: p.vorm.gaten ?? [] }, profiel: pr };
    if (pr.soort === 'koker') {
      const { t, diepte: D } = pr;
      // een holle koker (4 wanden); geïsoleerd: twee stalen kokers (voor en achter) met de isolatiestroken ertussen
      const koker = (z0, z1) => [{ pts, gaten: [], z0, z1: z0 + t }, { pts, gaten: [], z0: z1 - t, z1 }, { pts: knip(pts, 1, 0, t), gaten: [], z0: z0 + t, z1: z1 - t }, { pts: knip(pts, 1, V - t, V), gaten: [], z0: z0 + t, z1: z1 - t }];
      if (pr.iso) return { profiel: pr, delen: [...koker(0, pr.iso[0]), ...koker(pr.iso[1], D), { pts: knip(pts, 1, 0, 3), gaten: [], z0: pr.iso[0], z1: pr.iso[1], iso: true }, { pts: knip(pts, 1, V - 3, V), gaten: [], z0: pr.iso[0], z1: pr.iso[1], iso: true }] };
      return { profiel: pr, delen: koker(0, D) };
    }
    // hoeklijn: het ene been over het glas (zicht, dikte t), het andere tegen de koker (over de diepte)
    if (pr.soort === 'hoek') return { profiel: pr, delen: [{ pts, gaten: [], z0: 0, z1: pr.t }, { pts: knip(pts, 1, 0, pr.t), gaten: [], z0: pr.t, z1: pr.diepte }] };
    return { profiel: pr, delen: [{ pts, gaten: [], z0: 0, z1: pr.diepte }] };
  }
  if (p.vorm?.r) { const { r, zicht, hoek, t } = p.vorm; return { delen: [{ pts: ringSector(r, zicht, hoek), gaten: [], z0: 0, z1: t }] }; }
  if (p.soort === 'glas') return { delen: [{ pts: p.vorm.pts, gaten: [], z0: 0, z1: o?.glasDikte ?? 8.8, glas: true }] };
  if (p.vorm?.l) { const { b, l, t, gaten = [] } = p.vorm; return { delen: [{ pts: [[0, 0], [l, 0], [l, b], [0, b]], gaten: gaten.map(([x, y, d]) => [x, y, d / 2]), z0: 0, z1: t }] }; }
  return { delen: [] };
}
/** ringsector rond (0,0), symmetrisch rond de y-as, als veelhoek (48 stukjes op 180°) */
export function ringSector(r, zicht, hoek) {
  const R1 = r + zicht / 2, R0 = r - zicht / 2, a = (Math.min(hoek, 359.9) * Math.PI) / 360, n = Math.max(8, Math.ceil((hoek / 180) * 48)), uit = [];
  for (let i = 0; i <= n; i++) { const t = -a + (2 * a * i) / n; uit.push([R1 * Math.sin(t), R1 * Math.cos(t)]); }
  for (let i = n; i >= 0; i--) { const t = -a + (2 * a * i) / n; uit.push([R0 * Math.sin(t), R0 * Math.cos(t)]); }
  return uit;
}
/** volume in mm³ (voor de test: klopt de 3D-vorm met het gewicht?) */
export function volume3d(v) {
  let s = 0;
  for (const d of v.delen) if (!d.iso) s += (oppervlak(d.pts) - d.gaten.reduce((t, [, , r]) => t + Math.PI * r * r, 0)) * (d.z1 - d.z0);
  if (v.cilinder) s += Math.PI * v.cilinder.r ** 2 * v.cilinder.L;
  return s;
}

// ---------------------------------------------------------------- tekeningen per soort
/** staaf: overzicht op schaal, detail A en B (de uiteinden vergroot), doorsnede */
function tekenStaaf(p, el, o) {
  const { pts, L: Lg, V, gaten = [] } = p.vorm, pr = profiel(p.prof, V), rond = pr.soort === 'rond';
  const kant = (c) => { const q = pts.filter((x) => Math.abs(x[1] - c) < 0.5).map((x) => x[0]); return q.length >= 2 ? [Math.min(...q), Math.max(...q)] : [0, Lg]; };
  const k0 = kant(0), kV = kant(V), l0 = k0[1] - k0[0], lV = kV[1] - kV[0], boogEind = pts.length > 4;
  // 1. het hele stuk
  const sA = schaal(Math.min(180 / Lg, 16 / V)), X0 = 30 + (180 - Lg * sA) / 2, Y0 = 38;
  const P = (u, v, x0 = X0, y0 = Y0, s = sA) => [x0 + u * s, y0 + v * s];
  el.push(T(25, 30, `Aanzicht (${schaalTekst(sA)})`, 2.8, { vet: true }));
  el.push(poly(pts.map(([u, v]) => P(u, v))));
  const verborgen = (x0, y0, s, pp) => { if (pr.soort !== 'koker') return ''; return [pr.t, V - pr.t].map((c) => { const r = snijU(pp, c); return r ? L(x0 + r[0] * s, y0 + c * s, x0 + r[1] * s, y0 + c * s, 0.18, VERBORGEN) : ''; }).join(''); };
  el.push(verborgen(X0, Y0, sA, pts));
  if (rond || V * sA > 3) el.push(L(X0 - 3, Y0 + (V * sA) / 2, X0 + Lg * sA + 3, Y0 + (V * sA) / 2, 0.15, HART));
  for (const u of gaten) el.push(`<circle cx="${f(X0 + u * sA)}" cy="${f(Y0 + (V * sA) / 2)}" r="${f(Math.max(0.6, 4 * sA))}" fill="#fff" stroke="#111" stroke-width="0.25"/>`);
  // maten: kant v=0 boven, kant v=V onder, totale lengte onderaan als geen van beide de totale lengte is
  const yb = Y0 + V * sA;
  if (Math.abs(l0 - Lg) > 0.5 || Math.abs(lV - Lg) > 0.5) el.push(maat(X0 + k0[0] * sA, Y0, X0 + k0[1] * sA, Y0, 5, `${g(l0, 1)}`));
  el.push(maat(X0 + kV[0] * sA, yb, X0 + kV[1] * sA, yb, -5, `${g(lV, 1)}`));
  if (Math.abs(l0 - Lg) > 0.5 && Math.abs(lV - Lg) > 0.5) el.push(maat(X0, yb, X0 + Lg * sA, yb, -11, `${g(Lg, 1)}`));
  if (V * sA >= 5) el.push(maat(X0 + Lg * sA, Y0, X0 + Lg * sA, yb, 5, `${g(V, 1)}`));
  if (gaten.length) el.push(maat(X0, yb, X0 + gaten[0] * sA, yb, -11, `${g(gaten[0], 1)}`), maat(X0 + gaten.at(-1) * sA, yb, X0 + Lg * sA, yb, -11, `${g(Lg - gaten.at(-1), 1)}`));
  // 2. de uiteinden vergroot
  const nodig = gaten.length ? Math.min(gaten[0], Lg - gaten.at(-1)) + 14 : 0, sD = schaal(Math.min(46 / V, 3, nodig ? 72 / nodig : 3)), e = Math.min(Lg, 72 / sD), twee = Lg > e + 1;
  const vakken = twee ? [['A', 0, 26], ['B', Lg - e, 112]] : [['A', 0, 26]];
  for (const [letter, u0, bx] of vakken) {
    // kringetje op het overzicht (ISO 128: detail)
    const cu = u0 + e / 2, rr = Math.max(4, Math.min((e * sA) / 2 + 1.5, 14));
    const kx = X0 + (letter === 'A' ? Math.min(e, Lg / 4) / 2 : Lg - Math.min(e, Lg / 4) / 2) * sA, kr = Math.min(rr, Math.max(4, (V * sA) / 2 + 3));
    if (twee) el.push(`<circle cx="${f(kx)}" cy="${f(Y0 + (V * sA) / 2)}" r="${f(kr)}" fill="none" stroke="#111" stroke-width="0.25"/>`, T(kx + (letter === 'A' ? -kr - 1 : kr + 1), Y0 + (V * sA) / 2 - kr, letter, 3.2, { vet: true, anker: letter === 'A' ? 'end' : 'start' }));
    const deel = knip(pts, 0, u0, u0 + e), x0 = bx + 6, y0 = 84 + (40 - V * sD) / 2, Q = (u, v) => P(u - u0, v, x0, y0, sD);
    el.push(T(bx, 77, twee ? `Detail ${letter} (${schaalTekst(sD)}): ${letter === 'A' ? 'linker' : 'rechter'} uiteinde` : `Het stuk vergroot (${schaalTekst(sD)})`, 2.8, { vet: true }));
    el.push(poly(deel.map(([u, v]) => Q(u, v))), verborgen(x0 - u0 * sD, y0, sD, deel));
    if (rond || V * sD > 3) el.push(L(x0 - 2, y0 + (V * sD) / 2, x0 + e * sD + 2, y0 + (V * sD) / 2, 0.15, HART));
    // onderbreking (zigzag) aan de kant waar het stuk verder loopt
    if (twee) { const xb = letter === 'A' ? x0 + e * sD : x0; el.push(`<polyline points="${f(xb)},${f(y0 - 2)} ${f(xb + 1.2)},${f(y0 + V * sD * 0.35)} ${f(xb - 1.2)},${f(y0 + V * sD * 0.65)} ${f(xb)},${f(y0 + V * sD + 2)}" fill="none" stroke="#111" stroke-width="0.25"/>`); }
    // het uiteinde in dit vak: hoek en verschil tussen lange en korte kant
    const links = letter === 'A', a0 = links ? k0[0] : k0[1], aV = links ? kV[0] : kV[1], du = Math.abs(a0 - aV);
    if (boogEind && (links ? Math.min(k0[0], kV[0]) > 0.5 || pts.some((q) => q[0] < Math.max(k0[0], kV[0]) - 0.5 && q[1] > 0.5 && q[1] < V - 0.5) : true) && pts.filter((q) => (links ? q[0] < Math.max(k0[0], kV[0]) - 0.5 : q[0] > Math.min(k0[1], kV[1]) + 0.5) && q[1] > 0.5 && q[1] < V - 0.5).length > 1) {
      el.push(T(x0, y0 + V * sD + 17, 'Uiteinde volgens de boog: zagen en passen op de mal 1:1', 2.3));
    } else if (du > 0.5) {
      // de punt (scherpe hoek) ligt op de langste kant
      const punt = links ? (a0 < aV ? [a0, 0] : [aV, V]) : (a0 > aV ? [a0, 0] : [aV, V]), ander = punt[1] === 0 ? [aV, V] : [a0, 0];
      const hk = (Math.atan2(V, du) * 180) / Math.PI, pp = Q(...punt), aa = Q(...ander);
      const tKant = links ? 0 : Math.PI, tSnede = Math.atan2(aa[1] - pp[1], aa[0] - pp[0]);
      let t0 = tKant, t1 = tSnede; if (Math.abs(t1 - t0) > Math.PI) t1 += t1 < t0 ? 2 * Math.PI : -2 * Math.PI;
      el.push(`<line x1="${f(pp[0])}" y1="${f(pp[1])}" x2="${f(aa[0])}" y2="${f(aa[1])}" stroke="#c0392b" stroke-width="0.6"/>`);
      el.push(hoekMaat(pp[0], pp[1], Math.min(14, V * sD * 0.8), t0, t1, `${g(hk, 1)}°`, 2.6));
      el.push(maat(Q(Math.min(a0, aV), 0)[0], ander[1] === 0 ? y0 : y0 + V * sD, Q(Math.max(a0, aV), 0)[0], ander[1] === 0 ? y0 : y0 + V * sD, ander[1] === 0 ? 4 : -4, `${g(du, 1)}`));
      el.push(T(x0, y0 + V * sD + 17, `${Math.round(hk) === 45 ? 'Verstek 45°' : `Schuin ${g(hk, 1)}°`}: lange kant is ${g(du, 1)} langer dan de korte`, 2.3));
    } else el.push(T(x0, y0 + V * sD + 17, 'Recht afzagen (90°)', 2.3));
    el.push(maat(links ? x0 : x0 + e * sD, y0, links ? x0 : x0 + e * sD, y0 + V * sD, links ? -4 : 4, `${g(V, 1)}`));
    for (const u of gaten) if (u >= u0 - 1 && u <= u0 + e + 1) {
      const q = Q(u, V / 2);
      el.push(`<circle cx="${f(q[0])}" cy="${f(q[1])}" r="${f(Math.max(0.8, 3.4 * sD))}" fill="#fff" stroke="#111" stroke-width="0.25"/>`, L(q[0] - 5 * sD, q[1], q[0] + 5 * sD, q[1], 0.12, HART), T(q[0] + 4, q[1] - V * sD / 2 - 3, 'M8', 2.2));
      el.push(maat(links ? x0 : q[0], y0 + V * sD, links ? q[0] : x0 + e * sD, y0 + V * sD, -4, `${g(links ? u : Lg - u, 1)}`));
    }
  }
  // 3. doorsnede: het profiel van de deur (met sponning, isolatie, glas en glaslat) als het een kozijn-, kader- of roedeprofiel is
  const rol = rolVan(o, p.prof);
  if (rol) {
    const sec = sectie(o, rol), extra = rol === 'glaslat' || rol === 'kozijn' ? 0 : rol === 'roede' ? 28 : 14, s = [3, 2, 1.5, 1, 0.5].find((q) => (sec.V + extra) * q <= 66 && (sec.D + 6) * q <= 60) ?? 0.5;
    el.push(T(202, 77, 'Doorsnede van het profiel', 2.8, { vet: true }));
    el.push(tekenSectie(sec, 214 + (rol === 'roede' ? 14 * s : 0), 86, s, { o }));
    el.push(T(202, 86 + (sec.D + 6) * s + 10, `${sec.naam}`.slice(0, 52), 2.2), T(202, 86 + (sec.D + 6) * s + 14, `${s >= 1 ? `${s}:1` : `1:${1 / s}`} · ${sec.V} x ${sec.D}${sec.t ? ` · wand ${g(sec.t, 1)}` : ''}${sec.iso ? ` · geel = isolatie` : ''}${sec.koop ? ' · vereenvoudigd' : ''}`, 2.1, { kleur: '#555' }));
    return;
  }
  const dx = 202, dy = 84;
  el.push(T(dx, 77, 'Doorsnede (arcering = materiaal)', 2.8, { vet: true }));
  if (pr.soort === 'rond') {
    const s = schaal(Math.min(40 / pr.d, 3)), r = (pr.d / 2) * s, cx = dx + 30, cy = dy + 22;
    el.push(`<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="url(#arcering)" stroke="#111" stroke-width="0.35"/>`, L(cx - r - 3, cy, cx + r + 3, cy, 0.15, HART), L(cx, cy - r - 3, cx, cy + r + 3, 0.15, HART), maat(cx - r, cy + r, cx + r, cy + r, -5, `Ø${pr.d}`), T(dx, cy + r + 14, `${pr.naam} (${schaalTekst(s)})`, 2.3));
  } else {
    const s = schaal(Math.min(56 / pr.zicht, 44 / pr.diepte, 3)), w = pr.zicht * s, h = pr.diepte * s, x = dx + 10, y = dy + 2;
    const ro = pr.soort === 'koker' && !pr.koop && !pr.iso ? 2 * pr.t : 0; // koudgevormde koker: buitenstraal ± 2t (EN 10219-2)
    el.push(`<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}"${ro ? ` rx="${f(ro * s)}"` : ''} fill="url(#arcering)" stroke="#111" stroke-width="0.35"/>`);
    if (pr.soort === 'koker' && pr.iso) {
      // twee stalen schalen en de isolatiezone (geel) ertussen
      const [i0, i1] = pr.iso, gat = (a, b) => `<rect x="${f(x + pr.t * s)}" y="${f(y + (a + pr.t) * s)}" width="${f(w - 2 * pr.t * s)}" height="${f((b - a - 2 * pr.t) * s)}" fill="#fff" stroke="#111" stroke-width="0.3"/>`;
      el.push(gat(0, i0), gat(i1, pr.diepte), `<rect x="${f(x)}" y="${f(y + i0 * s)}" width="${f(w)}" height="${f((i1 - i0) * s)}" fill="#e3cf8f" stroke="#111" stroke-width="0.3"/>`, maat(x + w - pr.t * s, y, x + w, y, 4, `t = ${pr.t}`), maat(x + w, y + i0 * s, x + w, y + i1 * s, -4, `isolatie ${i1 - i0}`));
    } else if (pr.soort === 'koker') el.push(`<rect x="${f(x + pr.t * s)}" y="${f(y + pr.t * s)}" width="${f(w - 2 * pr.t * s)}" height="${f(h - 2 * pr.t * s)}"${ro ? ` rx="${f((ro - pr.t) * s)}"` : ''} fill="#fff" stroke="#111" stroke-width="0.3"/>`, maat(x + w - pr.t * s, y, x + w, y, 4, `t = ${pr.t}`));
    el.push(maat(x, y + h, x + w, y + h, -5, `${g(pr.zicht, 1)} zicht`), maat(x, y, x, y + h, -5, `${g(pr.diepte, 1)} diep`));
    el.push(T(dx, y + h + 14, `${pr.naam} (${schaalTekst(s)})`, 2.3), T(dx, y + h + 18, pr.koop ? 'vereenvoudigd: sponning en dichtingen volgens de catalogus' : pr.soort === 'systeem' ? 'vorm volgens de catalogus' : 'boven = de kant met de greep', 2.1, { kleur: '#555' }));
  }
}
/** boog uit plaat (lasergesneden): de ringsector op schaal met stralen, koorde, pijl en hoek; doorsnede van de lagen */
function tekenBoog(p, el, o) {
  const { r, zicht, hoek, t } = p.vorm, R1 = r + zicht / 2, R0 = r - zicht / 2, a = (Math.min(hoek, 359) * Math.PI) / 360;
  const bw = hoek >= 180 ? 2 * R1 : 2 * R1 * Math.sin(a), bh = R1 - Math.min(R0 * Math.cos(a), R1 * Math.cos(a));
  const s = schaal(Math.min(165 / bw, 108 / bh)), cx = 25 + 92, cy = 42 + R1 * s;
  el.push(T(25, 30, `Aanzicht (${schaalTekst(s)}), lasergesneden uit plaat ${t} mm`, 2.8, { vet: true }));
  const P = (rr, tt) => [cx + rr * s * Math.sin(tt), cy - rr * s * Math.cos(tt)];
  el.push(poly(ringSector(r, zicht, hoek).map(([x, y]) => [cx + x * s, cy - y * s])));
  // hartlijn van de boog (streep-punt)
  const h1 = P(r, -a), h2 = P(r, a);
  el.push(`<path d="M${f(h1[0])},${f(h1[1])} A${f(r * s)},${f(r * s)} 0 ${hoek > 180 ? 1 : 0} 1 ${f(h2[0])},${f(h2[1])}" fill="none" stroke="#111" stroke-width="0.15"${HART}/>`);
  const binnen = cy < 168;
  if (binnen) {
    el.push(L(cx - 3, cy, cx + 3, cy, 0.18), L(cx, cy - 3, cx, cy + 3, 0.18));
    for (const [rr, tt, nm] of [[R1, -a * 0.45, 'R'], [R0, a * 0.45, 'R']]) { const q = P(rr, tt); el.push(L(cx, cy, q[0], q[1], 0.18), `<polygon points="${f(q[0])},${f(q[1])} ${f(q[0] - Math.sin(tt) * 2.5 + Math.cos(tt) * 0.55)},${f(q[1] + Math.cos(tt) * 2.5 + Math.sin(tt) * 0.55)} ${f(q[0] - Math.sin(tt) * 2.5 - Math.cos(tt) * 0.55)},${f(q[1] + Math.cos(tt) * 2.5 - Math.sin(tt) * 0.55)}" fill="#111"/>`, T((cx + q[0]) / 2 + 1.5, (cy + q[1]) / 2, `${nm} ${g(rr, 1)}`, 2.5)); }
    if (hoek < 359) el.push(hoekMaat(cx, cy, Math.min(14, R0 * s * 0.6), -Math.PI / 2 - a, -Math.PI / 2 + a, `${g(hoek, 1)}°`));
  } else {
    // middelpunt buiten het blad: verkorte straal (ISO 129-1)
    for (const [rr, tt] of [[R1, -a * 0.45], [R0, a * 0.45]]) { const q = P(rr, tt), b = [q[0] - Math.sin(tt) * 22, q[1] + Math.cos(tt) * 22]; el.push(L(q[0], q[1], b[0], b[1], 0.18), T(b[0] + 1, b[1] + 3, `R ${g(rr, 1)} (middelpunt buiten het blad)`, 2.3)); }
    el.push(T(25, 160, `Hoek ${g(hoek, 1)}°`, 2.5));
  }
  if (hoek < 180) {
    const e1 = P(R1, -a), e2 = P(R1, a), top = P(R1, 0);
    el.push(L(e1[0], e1[1], e2[0], e2[1], 0.12, HART), maat(e1[0], e1[1], e2[0], e2[1], -6, `koorde ${g(2 * R1 * Math.sin(a), 1)}`), maat(e2[0], top[1], e2[0], e2[1], 6, `pijl ${g(R1 * (1 - Math.cos(a)), 1)}`));
  } else {
    const e1 = P(R1, -Math.PI / 2), e2 = P(R1, Math.PI / 2);
    el.push(maat(e1[0], e1[1], e2[0], e2[1], -8, `${g(2 * R1, 1)}`), maat(e2[0], P(R1, 0)[1], e2[0], e2[1], 6, `${g(R1, 1)}`));
  }
  el.push(maat(P(R0, -a)[0], P(R0, -a)[1], P(R1, -a)[0], P(R1, -a)[1], hoek >= 180 ? -4 : 4, `${g(zicht, 1)}`));
  // doorsnede: de lagen op elkaar
  const lagen = +(p.opm.match(/(\d+) lagen/)?.[1] ?? 1), dx = 222, dy = 84, sd = schaal(Math.min(40 / zicht, 44 / (lagen * t), 3)), w = zicht * sd;
  el.push(T(dx - 20, 77, 'Doorsnede (lagen)', 2.8, { vet: true }));
  for (let i = 0; i < lagen; i++) el.push(`<rect x="${f(dx)}" y="${f(dy + i * t * sd)}" width="${f(w)}" height="${f(t * sd)}" fill="url(#arcering)" stroke="#111" stroke-width="0.3"/>`);
  el.push(maat(dx, dy + lagen * t * sd, dx + w, dy + lagen * t * sd, -5, `${zicht}`), maat(dx, dy, dx, dy + lagen * t * sd, -5, lagen > 1 ? `${lagen} x ${t} = ${lagen * t}` : `${t}`));
  el.push(T(dx - 20, dy + lagen * t * sd + 14, `${schaalTekst(sd)} · ${lagen > 1 ? `${lagen} lagen, op elkaar gelast en rond geslepen` : 'één plaat'}`, 2.2));
}
/** plaat of paneel: aanzicht met gaten en zijaanzicht met de dikte */
function tekenPlaat(p, el) {
  const { b, l, t, gaten = [] } = p.vorm, s = schaal(Math.min(150 / l, 100 / b)), x0 = 40, y0 = 48, w = l * s, h = b * s;
  el.push(T(25, 30, `Aanzicht (${schaalTekst(s)})`, 2.8, { vet: true }));
  el.push(`<rect x="${f(x0)}" y="${f(y0)}" width="${f(w)}" height="${f(h)}" fill="#d7dadc" stroke="#111" stroke-width="0.35"/>`);
  const xs = [...new Set(gaten.map((q) => q[0]))].sort((a, c) => a - c);
  gaten.forEach(([gx, gy, d], i) => {
    const cx = x0 + gx * s, cy = y0 + gy * s, r = (d / 2) * s;
    el.push(`<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(Math.max(0.6, r))}" fill="#fff" stroke="#111" stroke-width="0.3"/>`, L(cx - r - 2, cy, cx + r + 2, cy, 0.12, HART), L(cx, cy - r - 2, cx, cy + r + 2, 0.12, HART));
    el.push(L(cx + r * 0.7, cy - r * 0.7, cx + r * 0.7 + 6, cy - r * 0.7 - 8 - i * 4, 0.18), T(cx + r * 0.7 + 7, cy - r * 0.7 - 8 - i * 4, `Ø${g(d, 1)}${/M8/.test(p.opm) ? ' (M8 tappen)' : ''}`, 2.5));
  });
  el.push(maat(x0, y0 + h, x0 + w, y0 + h, -6, `${l}`), maat(x0, y0, x0, y0 + h, -6, `${b}`));
  xs.forEach((gx, i) => el.push(maat(x0, y0 + h, x0 + gx * s, y0 + h, -12 - i * 6, `${g(gx, 1)}`)));
  if (gaten.length) el.push(maat(x0 + w, y0, x0 + w, y0 + gaten[0][1] * s, 6, `${g(gaten[0][1], 1)}`));
  // zijaanzicht (eerste hoek: rechts van het aanzicht)
  const zx = x0 + w + 22, ts = Math.max(t * s, 0.8);
  el.push(T(zx, y0 - 4, 'Zijaanzicht', 2.3), `<rect x="${f(zx)}" y="${f(y0)}" width="${f(ts)}" height="${f(h)}" fill="#d7dadc" stroke="#111" stroke-width="0.35"/>`, maat(zx, y0 + h, zx + ts, y0 + h, -6, `${t}`));
  el.push(T(202, 77, 'Plaat', 2.8, { vet: true }), T(202, 84, `${p.mat}`, 2.5), T(202, 89, `${b} x ${l} x ${t} mm`, 2.5), T(202, 94, 'Lasersnijden op de DXF; braam eraf', 2.3, { kleur: '#333' }));
}
/** ruit: de vorm met de glasmaat en de opbouw van het glas */
function tekenGlas(p, el, o, keuzes) {
  const { pts, b, h } = p.vorm, s = schaal(Math.min(150 / b, 118 / h)), x0 = 40, y0 = 36, [gb, gh] = p.maat.split(' x ');
  el.push(T(25, 30, `Aanzicht (${schaalTekst(s)}): daglicht, de ruit is 4 mm groter rondom`, 2.8, { vet: true }));
  el.push(poly(pts.map(([u, v]) => [x0 + u * s, y0 + (h - v) * s]), '#d6e4e9'));
  el.push(maat(x0, y0 + h * s, x0 + b * s, y0 + h * s, -6, `glas ${gb} (daglicht ${g(b, 1)})`), maat(x0, y0, x0, y0 + h * s, -6, `glas ${gh} (daglicht ${g(h, 1)})`));
  const gl = GLAS[keuzes.glas] ?? GLAS.helder, dub = o.opbouw === 'dubbel', gelaagd = /44\.2/.test(gl.soort);
  const lagen = [...(gelaagd ? [[4, '#cfe0e6'], [0.76, '#f3e9b5'], [4, '#cfe0e6']] : [[8, '#cfe0e6']]), ...(dub ? [[14, '#fff'], [6, '#cfe0e6']] : [])];
  const dx = 222, dy = 84, sd = 2, tot = lagen.reduce((a, [d]) => a + d, 0);
  el.push(T(202, 77, 'Opbouw (2:1)', 2.8, { vet: true }));
  let y = dy;
  for (const [d, c] of lagen) { el.push(`<rect x="${f(dx)}" y="${f(y)}" width="30" height="${f(d * sd)}" fill="${c}" stroke="#111" stroke-width="0.25"/>`); y += d * sd; }
  el.push(maat(dx, dy, dx, y, -5, `${g(tot, 2)}`));
  el.push(T(202, y + 8, dub ? `${gl.soort} | 14 spouw | 6 gehard` : gl.soort, 2.3), T(202, y + 12, 'altijd veiligheidsglas (EN 12543 / EN 12150)', 2.1, { kleur: '#555' }));
}

/** klein vooraanzicht van de deur met dit stuk in rood */
function plaatsInDeur(o, stukken, p, x, y, w, h) {
  const KB = o.kozijn.B, KH = o.kozijn.H, s = Math.min(w / KB, (h - 6) / KH), ox = x + (w - KB * s) / 2, oy = y + h, el = [];
  el.push(T(x, y - 1, 'Waar het stuk zit', 2.3, { vet: true }));
  el.push(vooraanzicht(o, s, ox, oy, { maten: false, assen: false, staal: '#9aa0a5', glas: '#eef3f5', paneel: '#b7bcc0', lijn: '#666' }));
  const X = (q) => ox + q * s, Y = (q) => oy - q * s;
  for (const st of stukken) if (st.pos === p.pos) {
    const pp = (st.d.a ? veelhoek(st.d, st.w, st.B, st.H) : band(st.d, st.w)).map(([a, b]) => [X(a + st.dx), Y(b + st.dy)]);
    el.push(`<polygon points="${pp.map(([a, b]) => `${f(a)},${f(b)}`).join(' ')}" fill="#c0392b" stroke="#c0392b" stroke-width="0.2"/>`);
  }
  for (const [a, b] of p.plaatsen ?? []) el.push(`<circle cx="${f(X(a))}" cy="${f(Y(b))}" r="1.3" fill="none" stroke="#c0392b" stroke-width="0.5"/>`);
  return el.join('');
}

/** het detailblad van één positie; ctx = verbindingen(o, keuzes) (één keer per deur berekend) */
export function detailBlad(o, p, ctx, keuzes = {}, meta = {}) {
  const el = [];
  el.push(`<rect x="20" y="10" width="${W4 - 30}" height="${H4 - 20}" fill="none" stroke="#111" stroke-width="0.7"/>`);
  // kop: ballon met het nummer, benaming, materiaal
  el.push(`<circle cx="31" cy="19.5" r="6" fill="#fff" stroke="#111" stroke-width="0.5"/>`, T(31, 21.2, String(p.pos), 4.6, { anker: 'middle', vet: true }));
  el.push(T(40, 18.5, `${p.n} x ${p.naam}`, 4.2, { vet: true }), T(40, 23.5, `${p.mat} · ${p.maat}${p.zagen ? ` · zagen ${p.zagen}` : ''} · ${g(p.kg, 2)} kg/st`, 2.6));
  if (p.soort === 'staaf') tekenStaaf(p, el, o);
  else if (p.vorm?.r) tekenBoog(p, el, o);
  else if (p.soort === 'glas') tekenGlas(p, el, o, keuzes);
  else if (p.vorm?.l) tekenPlaat(p, el);
  el.push(plaatsInDeur(o, ctx.stukken, p, 232, 16, 50, 56));
  // onderaan links: bewerking en verbindingen van dit stuk
  const regels = [`Bewerking: ${p.opm}`];
  for (const gr of ctx.groepen) if (gr.pa === p.pos || gr.pb === p.pos) {
    const ander = gr.pa === p.pos ? gr.pb : gr.pa, an = ctx.posities.find((x) => x.pos === ander)?.naam ?? '';
    regels.push(`${gr.code}: ${gr.n} x ${verbindingVan(gr.soort, o.sys).naam.toLowerCase()} met pos ${ander} (${an})`);
  }
  if (p.gaten?.length) regels.push(`Gaten: ${p.gaten.length} (plaats, maat en verzinking op boringenblad ${meta.nr ?? 'TD'}-B${String(p.pos).padStart(2, '0')})`);
  if (regels.length === 1 && p.soort === 'staaf' && /lat|Glaslat|Aanslag/.test(p.naam)) regels.push('Hechten om de 150 en lassen (voor) of M4 verzonken om de 250 (achter): zie de werkwijze');
  const rij = (t, max = 92) => { const w = t.split(' '), uit = ['']; for (const x of w) { if ((uit.at(-1) + ' ' + x).length > max) uit.push(x); else uit[uit.length - 1] += (uit.at(-1) ? ' ' : '') + x; } return uit; };
  const lijnen = regels.flatMap((t) => rij(t)).slice(0, 9);
  el.push(T(25, 168, 'Bewerking en verbindingen', 2.8, { vet: true }));
  lijnen.forEach((t, i) => el.push(T(25, 173 + i * 3.4, t, 2.25)));
  // titelblok A4 (ISO 7200, ingekort): 135 x 24
  const tx = W4 - 10 - 135, ty = H4 - 10 - 24, veld = (x, r, kop, w, h = 2.4, vet = false) => { if (x) el.push(L(tx + x, ty + r * 8, tx + x, ty + r * 8 + 8, 0.25)); el.push(T(tx + x + 1, ty + r * 8 + 2.5, kop, 1.6, { kleur: '#555' }), T(tx + x + 1, ty + r * 8 + 6.5, w, h, { vet })); };
  el.push(`<rect x="${tx}" y="${ty}" width="135" height="24" fill="#fff" stroke="#111" stroke-width="0.5"/>`, L(tx, ty + 8, tx + 135, ty + 8), L(tx, ty + 16, tx + 135, ty + 16));
  veld(0, 0, 'Titel', `Pos ${p.pos}: ${p.naam}`.slice(0, 62), 2.6, true);
  veld(0, 1, 'Deur', `${o.stijl.naam} · opening ${o.B} x ${o.H}`.slice(0, 48), 2.3); veld(88, 1, 'Tekeningnummer', `${meta.nr ?? `TD-${o.stijl.id}`}-${String(p.pos).padStart(2, '0')}`, 2.4, true);
  veld(0, 2, 'Maten en toleranties', 'mm · ISO 2768-m · eerste hoek', 2.2); veld(55, 2, 'Opgesteld', 'Ian · laswerken', 2.2); veld(88, 2, 'Uitgifte', meta.datum ?? '', 2.2); veld(112, 2, 'Blad', meta.blad ?? '1 / 1', 2.2);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W4} ${H4}" width="${W4}mm" height="${H4}mm" font-family="Arial, Helvetica, sans-serif">${ARCERING}<rect width="${W4}" height="${H4}" fill="#fff"/>${el.join('\n')}</svg>`;
}

/** alle detailbladen van een deur (geen inkoop): [{ pos, svg }] en de stuklijst */
export function detailBladen(o, keuzes = {}, meta = {}) {
  const ctx = verbindingen(o, keuzes), lijst = ctx.posities.filter((p) => p.soort !== 'inkoop');
  return { ctx, posities: ctx.posities, bladen: lijst.map((p, i) => ({ pos: p.pos, svg: detailBlad(o, p, ctx, keuzes, { ...meta, blad: `${i + 1} / ${lijst.length}` }) })) };
}
export { MATEN };
