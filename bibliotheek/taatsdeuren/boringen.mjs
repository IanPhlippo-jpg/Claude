// De gaten in elk stuk van een deur: waar, hoe groot, verzonken (90°) of getapt, door één of beide wanden. Eén bron
// voor de stuklijst (gelijke stukken met dezelfde gaten zijn één positie), de stukbladen, het boringenblad en de
// montage. Per profielsysteem:
//  - staal (eigen koker): M4 getapt in de binnenwand voor de hoeklijn achter het glas; de hoeklijn Ø4,5 ⌵ Ø9; de kern van
//    de roede M4, de lat achter Ø4,5 ⌵ Ø9; de pivot: doorgang in de onderwand (Ø9), Ø20 voor de bovenpen.
//  - aluminium: boringen Ø6,5 in de achterwand voor de stelschroeven van de hoekverbinders; de roeden met verzonken
//    schroeven (P1/P2: Ø5,5 ⌵ Ø10) of bouten (Du Pont: Ø6,6 ⌵ Ø13) door de stijl; de greep met doorgaande bouten; de pivot
//    met verzonken bouten in de inlegplaten.
//  - altijd: kozijnankers (Ø10 aan de muurkant, Ø16 aan de deurkant voor de kop) en de bus van de bovenpen in het kozijn.
// Een gat: { p: [x, y] in het vlak van de groep (vleugel of kozijn), vlak: 'voor' | 'achter' | 'zijde', z (diepte, bij
// 'zijde'), d, verz (Ø verzinking 90°), draad ('M4'), door (1 of 2 wanden, of tekst), doel, rechthoek [b, h] }.
import { MATEN } from './deuren.mjs';
import { STAAF } from './prijzen.mjs';

const fm = (x) => String(Math.round(x * 10) / 10).replace('.', ',');
const TAP = { M4: 3.3, M5: 4.2, M6: 5, M8: 6.8 };
/** de maat van een gat zoals op een tekening (ISO 15786: ⌵ = verzinking) */
export function gatTekst(b) {
  if (b.rechthoek) return `uitsparing ${fm(b.rechthoek[0])} x ${fm(b.rechthoek[1])}`;
  const kern = b.draad ? (b.vloei ? `${b.draad} (vloeiboor Ø${fm(b.vloei)}, rolltap)` : `${b.draad} (boor Ø${fm(TAP[b.draad])})`) : b.d2 && b.d2 !== b.d ? `Ø${fm(b.d)} + Ø${fm(b.d2)}` : `Ø${fm(b.d)}`;
  return `${kern}${b.verz ? ` ⌵ Ø${fm(b.verz)} x 90°` : ''}${b.door === 2 ? ', door beide wanden' : typeof b.door === 'string' ? `, ${b.door}` : ''}`;
}
export const tapBoor = (m) => TAP[m];
/** gelijk verdeeld: eerste en laatste op 'rand' van de uiteinden, ten hoogste 'max' uit elkaar */
export function verdeel(l, max = 250, rand = 30) {
  if (l < 2 * rand + 10) return [l / 2];
  const n = Math.max(2, Math.ceil((l - 2 * rand) / max) + 1);
  return Array.from({ length: n }, (_, i) => rand + (i * (l - 2 * rand)) / (n - 1));
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1]], add = (a, b) => [a[0] + b[0], a[1] + b[1]], mul = (a, k) => [a[0] * k, a[1] * k], dot = (a, b) => a[0] * b[0] + a[1] * b[1];
/** een recht stuk: as van a naar b, de buitenkant (naar de rand van de groep) en de binnenkant op w/2 */
export function stukGeo(d, w, B, H) {
  const ab = sub(d.b, d.a), L = Math.hypot(...ab), u = mul(ab, 1 / L), n = [-u[1], u[0]], mid = mul(add(d.a, d.b), 0.5);
  const rand = (p) => Math.min(p[0], B - p[0], p[1], H - p[1]);
  const nOut = rand(add(mid, mul(n, w / 2))) <= rand(sub(mid, mul(n, w / 2))) ? n : mul(n, -1);
  const op = (t, s) => add(add(d.a, mul(u, t)), mul(nOut, s));
  return { a: d.a, b: d.b, u, L, nOut, w, op, buiten: (t) => op(t, w / 2), binnen: (t) => op(t, -w / 2), t: (p) => dot(sub(p, d.a), u), dwars: (p) => dot(sub(p, d.a), nOut) };
}

/** de ruitzijden langs de binnenkant van het kader (waar een glaslat komt), per groep; zoals de stuklijst ze vindt */
export function glaslatZijden(o, g, r, B, H) {
  const uit = [], op = (q) => Math.abs(q[0] - r) < 0.01 || Math.abs(q[0] - (B - r)) < 0.01 || Math.abs(q[1] - r) < 0.01 || Math.abs(q[1] - (H - r)) < 0.01;
  for (const p of g.ruiten ?? []) p.forEach((a, i) => {
    const b = p[(i + 1) % p.length], lijn = (Math.abs(a[0] - b[0]) < 0.01 && (Math.abs(a[0] - r) < 0.01 || Math.abs(a[0] - (B - r)) < 0.01)) || (Math.abs(a[1] - b[1]) < 0.01 && (Math.abs(a[1] - r) < 0.01 || Math.abs(a[1] - (H - r)) < 0.01));
    if (op(a) && op(b) && lijn && Math.hypot(b[0] - a[0], b[1] - a[1]) >= 20) uit.push([a, b]);
  });
  return uit;
}

/** de diepte (z) en de plaats in de holte voor de hoekverbinder: { vc (vanaf de buitenkant), ... } */
function holteMidden(prof) {
  const st = STAAF[prof] ?? {};
  if (st.holte) return (st.wand ?? 2) + st.holte[0] / 2;
  return (st.zicht ?? 25) / 2;
}

/**
 * de gaten van één stuk (deel d van groep g); wat = 'kozijn' | 'vleugel' | 'zijlicht'...; rol = 'kader' | 'kozijn' |
 * 'kern' | 'latAchter' | 'roede'. vleugel = de vleugel (voor taats en greep), alle = alle groepen (voor het kozijn).
 */
export function gatenVan(o, { g, d, B, H, rol, vleugel, keuzes = {} }) {
  const sys = o.sys, alu = !!sys.alu, K = sys.kader.zicht, D = sys.kader.diepte, gd = o.glasDikte ?? 8.8, uit = [];
  const w = rol === 'kozijn' ? sys.kozijn.zicht : rol === 'kader' ? K : sys.roede.zicht, G = stukGeo(d, rol === 'kern' ? 20 : w, B, H);
  const staand = Math.abs(d.a[0] - d.b[0]) < 1e-6, gat = (x) => uit.push(x);
  if (rol === 'kader') {
    // 1. aluminium: boringen voor de stelschroeven van de hoekverbinders, 25 en 48 van elke verstekhoek
    if (alu) for (const t of [25, 48, G.L - 48, G.L - 25]) gat({ p: G.binnen(t), vlak: 'zijde', z: D / 2, d: 6.5, doel: `stelschroef van de hoekverbinder, aan de glaszijde${sys.verbinders ? ' in de gleufbodem' : ''} (verborgen achter het glas)` });
    // 2. de roeden die tegen dit stuk komen (aluminium: geschroefd door dit stuk)
    if (alu) for (const r of g.delen.filter((x) => x.soort === 'roede' && x.a)) for (const e of [r.a, r.b]) {
      if (Math.abs(G.dwars(e) + K / 2) > 1 || G.t(e) < 0 || G.t(e) > G.L) continue;
      const t = G.t(e), sr = STAAF[sys.roede.staaf];
      if (sys.verbinders) { const z = (D - sys.roede.diepte) / 2 + (sr?.gaten?.[0]?.[1] ?? 19.5); gat({ p: G.buiten(t), vlak: 'zijde', z, d: 10, d2: 5.5, door: 'Ø10 in de buitenwand (toegang, afdekdop), Ø5,5 in de gleufbodem', doel: 'schroef 4,8 x 38 bolkop in het schroefkanaal van de roede' }); }
      else gat({ p: G.buiten(t), vlak: 'zijde', z: D / 2, d: 13, d2: 6.6, door: 'Ø13 in de buitenwand (toegang, afdekdop), Ø6,6 in de binnenwand', doel: 'cilinderkopbout M6 x 30 in de T-verbinder' });
    }
    // 3. eigen koker: M4 getapt in de binnenwand voor de hoeklijn achter het glas
    if (sys.glaslat.achter) for (const [a, b] of glaslatZijden(o, g, K, B, H)) {
      const ta = G.t(a), tb = G.t(b);
      if (Math.abs(G.dwars(a) + K / 2) > 0.5 || Math.abs(G.dwars(b) + K / 2) > 0.5) continue;
      const l = Math.abs(tb - ta);
      for (const s of verdeel(l)) gat({ p: G.binnen(Math.min(ta, tb) + s), vlak: 'zijde', z: D / 2 + gd / 2 + 9, draad: 'M4', vloei: 3.7, doel: 'hoeklijn achter het glas (vloeiboren Ø3,7, rolltappen M4: ± 5 mm draad in 2 mm wand)' });
    }
    // 4. de pivot (vleugel): onderregel en bovenregel aan de scharnierkant
    if (vleugel && o.scharnier !== 'verdekt' && !staand) {
      const ax = vleugel.taats === 'links' ? MATEN.taats : B - MATEN.taats, zin = vleugel.taats === 'links' ? 1 : -1, onder = G.buiten(G.L / 2)[1] < H / 2;
      const premium = keuzes.scharnier === 'premium';
      const tAx = G.t([ax, d.a[1]]);
      if (onder && premium) gat({ p: G.buiten(tAx + zin * 70), vlak: 'zijde', z: D / 2, rechthoek: [200, 24], doel: 'FritsJurgens: uitsparing volgens de handleiding (maat ter controle)' });
      else if (onder) for (const dx of [-20, 120]) gat({ p: G.buiten(tAx + zin * dx), vlak: 'zijde', z: D / 2, d: alu ? 6.6 : 9, doel: `doorgang voor de bout M${alu ? 6 : 8} van de deurplaat (pivot)` });
      else {
        gat({ p: G.buiten(tAx), vlak: 'zijde', z: D / 2, d: 20, doel: 'bovenpen van de pivot (de pen zit in de deur)' });
        gat({ p: G.binnen(tAx + zin * 22), vlak: 'zijde', z: D / 2, d: 8, doel: 'intrekgat: de pen met een staafje indrukken om de deur uit te nemen (glaszijde)' });
        if (alu) gat({ p: G.binnen(tAx - zin * 22), vlak: 'zijde', z: D / 2, d: 6.5, doel: 'stelschroef van de pendrager (glaszijde, verborgen)' });
      }
    }
    // 5. aluminium: doorgaande bouten van de greep in de staander aan de sluitkant
    if (vleugel && alu && staand) {
      const xs = vleugel.taats === 'links' ? B - MATEN.greep.afstand : MATEN.greep.afstand;
      if (Math.abs(xs - d.a[0]) < K) for (const dy of [-(MATEN.greep.lengte / 2 - 80), MATEN.greep.lengte / 2 - 80]) gat({ p: [xs, MATEN.greep.hoogte - vleugel.y + dy], vlak: 'voor', d: 12.2, d2: 12.2, door: 'Ø12,2 voor en achter: afstandsbus Ø12/Ø8,5 erin (de bout drukt de koker niet plat)', doel: 'doorgaande bout M8 van de greep' });
    }
    // 6. verdekte scharnieren: uitsparing in de scharnierstijl
    if (vleugel && o.scharnier === 'verdekt' && staand && Math.abs(d.a[0] - (vleugel.taats === 'links' ? K / 2 : B - K / 2)) < 1) {
      const bh = keuzes.scharnierModel === 'verdektZwaar' ? 240 : 170;
      for (const y of [250, H / 2, H - 250]) gat({ p: G.buiten(G.t([d.a[0], y])), vlak: 'zijde', z: D / 2, rechthoek: [bh, 32], doel: 'lasbak van het verdekte scharnier' });
    }
  }
  if (rol === 'kozijn') {
    const KZ = sys.kozijn.zicht, DZ = sys.kozijn.diepte;
    if (alu && !staand) for (const t of [25, 48, G.L - 48, G.L - 25]) gat({ p: G.buiten(t), vlak: 'zijde', z: DZ / 2, d: 6.5, doel: 'stelschroef van de hoekverbinder, aan de muurkant (verborgen na het plaatsen)' });
    if (alu && staand) { const boven = Math.max(d.a[1], d.b[1]); for (const y of [boven - 25, boven - 48]) gat({ p: G.buiten(G.t([d.a[0], y])), vlak: 'zijde', z: DZ / 2, d: 6.5, doel: 'stelschroef van de hoekverbinder, aan de muurkant (verborgen na het plaatsen)' }); }
    if (staand && (d.a[0] < KZ || d.a[0] > B - KZ)) for (const y of [200, H / 2, H - 260]) gat({ p: G.binnen(G.t([d.a[0], y])), vlak: 'zijde', z: DZ / 2, d: 16, d2: 10, door: 'Ø16 aan de deurkant, Ø10 aan de muurkant', doel: 'kozijnanker Ø8 (kop door Ø16, afdekdop)' });
    // de bus van de bovenpen in de bovenregel, recht boven elke taatsas
    if (!staand && d.a[1] > H - KZ && o.scharnier !== 'verdekt') for (const v of o.vleugels) {
      const ax = v.x + (v.taats === 'links' ? MATEN.taats : v.B - MATEN.taats), t = G.t([ax, d.a[1]]);
      gat({ p: G.binnen(t), vlak: 'zijde', z: DZ / 2, d: 20, doel: alu ? 'doorgang voor de pen; de glijbus Ø19,2 zit in de pendrager' : 'doorgang voor de pen; de lasring Ø30/Ø19,2 (glijbus) erboven gelast' });
      if (alu) gat({ p: G.buiten(t + 30), vlak: 'zijde', z: DZ / 2, d: 6.5, doel: 'stelschroef van de pendrager (muurkant, verborgen)' });
    }
    if (o.scharnier === 'verdekt' && staand) for (const v of o.vleugels) {
      const xs = v.x + (v.taats === 'links' ? 0 : v.B);
      if (Math.abs(G.binnen(0)[0] - xs) > MATEN.speling + 1) continue;
      const bh = keuzes.scharnierModel === 'verdektZwaar' ? 240 : 170;
      for (const y of [250, v.H / 2, v.H - 250]) gat({ p: G.binnen(G.t([d.a[0], v.y + y])), vlak: 'zijde', z: DZ / 2, rechthoek: [bh, 32], doel: 'lasbak van het verdekte scharnier' });
    }
  }
  if (rol === 'kern' && sys.roede.lat) for (const s of verdeel(G.L)) gat({ p: G.op(s, 0), vlak: 'achter', draad: 'M4', doel: 'schroef van de lat achter' });
  if (rol === 'latAchter') for (const s of verdeel(G.L)) gat({ p: G.op(s, 0), vlak: 'achter', d: 4.5, verz: 9, doel: 'schroef M4 x 10 verzonken in de kern' });
  if (rol === 'roede' && alu && !sys.verbinders) for (const s of [20, G.L - 20]) gat({ p: G.op(s, 0), vlak: 'achter', d: 5.5, doel: 'stelschroef M5 van de T-verbinder' });
  return uit;
}

/** gaten van een glaslat (lengte l): de hoeklijn achter of het L-profiel achter; in eigen assen u (0..l), v (dwars) */
export function glaslatGaten(o, l) {
  const sys = o.sys;
  if (sys.glaslat.achter) return verdeel(l).map((u) => ({ u, v: 9, vlak: 'been', d: 4.5, verz: 9, doel: 'schroef M4 x 10 verzonken in de koker (been 3 mm: de kop van 2,5 ligt vlak)', deel: 'achter' }));
  if (sys.glaslat.staaf === 'dupontL2010') return verdeel(l, 300).map((u) => ({ u, v: 11, vlak: 'been', d: 3.6, doel: 'boorschroef 3,5 x 13 met bolkop (DIN 7504-N), enkel het L-profiel achter', deel: 'achter' }));
  return [];
}
