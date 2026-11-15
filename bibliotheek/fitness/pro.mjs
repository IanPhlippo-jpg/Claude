// Pro-uiterlijk (v5): wat een merktoestel van een zelfgemaakt toestel onderscheidt, op het model gezet na de bouw en
// vóór afwerken(), zodat alles in de stuklijst, de prijs, de controles en de tekeningen meekomt. Per soort een stijl:
//  - rekken (Rogue/Eleiko): mat zwart, gelaserde logoplaat op de bovenligger, UHMW in de J-cups, eindkappen;
//  - plate-loaded (Hammer Strength): vlakovaalbuis voor de hefboomarmen, zwart frame met een accentkleur, verchroomde
//    schijfhouders;
//  - kabel/selectorized (Life Fitness/Technogym): antraciet frame, zilveren stapelkap met kijkvenster en sleuf voor de
//    selectiepen, instructieplaat op de kap, katrolkappen;
//  - overal: knoppen en popper-pins in de accentkleur (touch points), verborgen rubbervoeten, logoplaat.
// Logo = placeholder (de zaak heeft nog geen naam); merken en logo's van anderen worden niet nagemaakt. Node en browser.
import { balk, add, mul, sub, norm, cross, dot, aabb } from './model.mjs';
import { obb, botsen } from './controle.mjs';

/** stijl per soort: standaard frame-RAL, accentkleur (touch points), kleur van de kappen */
export const STIJL = {
  rek: { naam: 'rek: mat zwart, logoplaat, UHMW', ral: '9005', accent: '#d9a400', kap: null },
  bank: { naam: 'bank: mat zwart, bies op de kussens', ral: '9005', accent: '#d9a400', kap: null },
  plate: { naam: 'plate-loaded: ovaalbuis, zwart met rood accent, chroom', ral: '9005', accent: '#c8102e', kap: null },
  kabel: { naam: 'kabel: antraciet, zilveren kappen met venster', ral: '7016', accent: '#e8590c', kap: '#9ea3a8' },
};
/** profielkeuze per soort: plate-loaded krijgt vlakovaalbuis voor de hefboomarmen (berekening volgt het profiel) */
export function stijlVersie(V, soort) {
  if (soort !== 'plate') return V;
  return { ...V, P: { ...V.P, hefboom: V.id === 'pro' ? 'o120x60x4' : V.id === 'semi' ? 'o120x60x3' : 'o100x50x3' } };
}
const VAST = /^(frame|Zijframe|Bovenligger|Onderligger|Toren|Staander|Vloerligger)/;
const as3 = (v) => v.map((x) => Math.round(x * 1e6) / 1e6);
const asAs = (v) => { const i = v.findIndex((x) => Math.abs(x) > 0.999); return i < 0 ? -1 : i; };

/** zet het pro-uiterlijk op het model (bouwer b) van toestel def */
export function proUiterlijk(b, def) {
  const o = b.o, oud = b.huidig, stijl = STIJL[def.soort] ?? STIJL.rek;
  o.stijl = { ...stijl, soort: def.soort };
  // afwerking (fase B): frame-RAL, kussenkleur, chroom of zwart gecoat, logoplaat ja/nee
  const af = o.opties?.afwerking ?? {};
  o.afwerking = { ral: af.ral ?? stijl.ral, leer: af.leer ?? 'zwart', chroom: af.chroom ?? true, logo: af.logo ?? true };
  o.pronk = o.pronk ?? [];
  // 1. touch points: de trekknop van elke veerpen/popper-pin en de kop van de selectiepen in de accentkleur, de kraag zwart
  for (const k of o.koop) if (/pullpin|veerpen|popper/i.test(k.key)) for (const g of k.geo) { if (g.kleur === 'ring') g.kleur = 'accent'; else if (g.kleur === 'rubber') g.kleur = 'eindkap'; }
  for (const k of o.koop) if (/selectiepen/i.test(k.key)) for (const g of k.geo) if (g.kleur === 'rubber') g.kleur = 'accent';
  // 2. verborgen stelvoeten: de rubbervoet sluit tegen de koker, de schroefdraad zit erin (geen zichtbaar zeskant)
  for (const k of o.koop) if (/^voet(Thuis|Pro)$/.test(k.key)) {
    const rubber = k.geo.filter((g) => g.kleur === 'rubber'), zes = k.geo.filter((g) => g.zes);
    k.geo = rubber.map((g, i) => { const top = zes[i] ? Math.max(zes[i].a[2], zes[i].b[2]) : Math.max(g.a[2], g.b[2]); return balk([g.a[0], g.a[1], Math.min(g.a[2], g.b[2])], [g.a[0], g.a[1], top], g.v, g.bw, g.bh, true, 'rubber'); });
    k.naam = k.naam.replace(/^(Stelvoet|Rubbervoet) M10/, '$1 M10 verborgen (rubber tegen de koker)');
  }
  // 3. verchroomde schijfhouders (hardchroom of RVS-huls): niet gecoat
  const chroom = o.delen.filter((d) => d.soort === 'staaf' && /^(Schijfhouder|Laadpen)/.test(d.naam));
  if (!o.afwerking.chroom) chroom.length = 0; // zwart: de schijfhouders worden mee gecoat
  for (const d of chroom) { d.geo[0].kleur = 'chroom'; d.afwerking = 'hardverchroomd, niet poedercoaten'; }
  if (chroom.length) b.koop('verchromen', chroom.length, [], { naam: `Hardverchromen: ${chroom.length} schijfhouder${chroom.length > 1 ? 's' : ''} (of RVS-huls Ø50 erover)`, groep: 'afwerking' });
  // 4. stapelkap (kabel): zilver/antraciet gezet plaatwerk, voorkant met kijkvenster en sleuf voor de selectiepen
  stapelKap(b);
  // 5. katrolkappen (ABS, 2 schalen) op elke katrol waar ze vrij passen
  katrolKappen(b);
  // 6. naafkappen in de accentkleur op de draaipunten van de hefbomen (plate-loaded: herkenbare 'touch points')
  naafKappen(b);
  // 6b. banken: lange kussens taps (smaller naar de heup), zoals bij de merkbanken
  if (def.soort === 'bank') for (const k of o.kussens) { const g = k.geo[0]; if (k.L >= 900 && k.breedte >= 260 && !g.taps && !g.neus) g.taps = [k.breedte - 50, k.breedte]; }
  // 7. rekken: kopplaten met schuine rand op de staanders, gelaste eindplaten met ronde hoeken op de voeten, zijplaat met naam
  if (def.soort === 'rek' || def.id === 'FP-11') rekVorm(b, o.afwerking.logo);
  // 8. logoplaat (gelaserd 3 mm met logo-uitsparing, op VHB-tape)
  if (o.afwerking.logo) logoPlaat(b, def);
  b.groep(oud);
}

/** kap van de stapel: de voorplaat wordt paneel + venster + sleuf + venster + paneel; achter en zijstroken als paneel */
function stapelKap(b) {
  const o = b.o, voor = o.delen.filter((d) => d.kleur === 'kap' && !d.contour && /^Afscherming voor/.test(d.naam));
  for (const d of o.delen) if (d.kleur === 'kap' && /^Afscherming (achter|zijkant)/.test(d.naam)) d.geo[0].kleur = 'kappaneel';
  let n = 0;
  for (const d of voor) {
    const [mn, mx] = [d.mn, d.mx], ix = mx[0] - mn[0] > mx[1] - mn[1] ? 0 : 1, iy = 1 - ix; // ix = breedte van de plaat (x of y)
    const c = (mn[ix] + mx[ix]) / 2, W = mx[ix] - mn[ix], sl = 25, vw = Math.min(55, W / 2 - sl - 60);
    if (vw < 20) { d.geo[0].kleur = 'kappaneel'; continue; }
    const stuk = (a0, a1, kleur, z0 = mn[2], z1 = mx[2]) => { const p0 = [...mn], p1 = [...mx]; p0[ix] = a0; p1[ix] = a1; p0[2] = z0; p1[2] = z1; const m = p0.map((x, i) => (x + p1[i]) / 2), v = [0, 0, 0]; v[ix] = 1; return balk([m[0], m[1], z0], [m[0], m[1], z1], v, a1 - a0, p1[iy] - p0[iy], false, kleur); };
    const vz0 = mn[2] + 60, vz1 = mx[2] - 40;
    d.geo = [stuk(mn[ix], c - sl - vw, 'kappaneel'), stuk(c + sl + vw, mx[ix], 'kappaneel'), stuk(c - sl - vw, c - sl, 'venster', vz0, vz1), stuk(c + sl, c + sl + vw, 'venster', vz0, vz1),
      stuk(c - sl - vw, c - sl, 'kappaneel', mn[2], vz0), stuk(c + sl, c + sl + vw, 'kappaneel', mn[2], vz0), stuk(c - sl - vw, c + sl + vw, 'kappaneel', vz1, mx[2])];
    d.opm = `gezet plaatwerk 1,5 mm, poedercoat RAL 9006 (zilver); uitsparing 2 x ${Math.round(vw)} x ${Math.round(vz1 - vz0)} voor het kijkvenster (polycarbonaat 4 mm) en een sleuf ${2 * sl} mm voor de selectiepen; 4 x M8 aan de staanders, kanten omgezet`;
    n += 2;
    // instructieplaat op het linkerpaneel, op ooghoogte (of zo hoog als de kap gaat)
    const pw = Math.min(150, c - sl - vw - mn[ix] - 24), ph = Math.round(pw * 1.4);
    if (pw >= 60) {
      const nrm = [0, 0, 0]; nrm[iy] = -1; // de voorplaat ligt aan de -y-kant van de stapel
      const front = nrm[iy] < 0 ? mn[iy] - 0.6 : mx[iy] + 0.6, zc = Math.min(1400, mx[2] - ph / 2 - 40), xc = mn[ix] + 12 + pw / 2;
      const p = [0, 0, zc]; p[ix] = xc; p[iy] = front;
      const op = [0, 0, 1], zij = norm(cross(nrm, op));
      o.pronk.push(balk(add(p, mul(op, -ph / 2)), add(p, mul(op, ph / 2)), zij, pw, 1, false, 'instructie'));
      o.instructieOpKap = true;
    }
  }
  if (n) b.koop('polycarbonaat', n, [], { naam: `Kijkvenster polycarbonaat 4 mm in de stapelkap (${n} stuks)`, groep: 'afwerking' });
  if (o.instructieOpKap) b.koop('instructiesticker', 1, [], { naam: 'Instructieplaat op de stapelkap (oefeningen, spieren, pen-instructie)', groep: 'afwerking' });
}

/** katrolkap: twee ABS-schalen buiten de beugel; alleen waar ze geen stalen deel raken */
function katrolKappen(b) {
  const o = b.o, staal = o.delen.filter((d) => d.kleur !== 'kap').map((d) => ({ d, B: d.geo.map((g) => obb(g, 0.5)) }));
  let n = 0;
  for (const k of o.katrollen) {
    const ax = k.as, sv = Math.abs(ax[2]) > 0.9 ? [1, 0, 0] : norm(cross(ax, [0, 0, 1]));
    for (const D of [k.D + 24, k.D + 8]) {
      const geo = [-1, 1].map((s) => balk(add(k.c, mul(ax, s * 31)), add(k.c, mul(ax, s * 34)), sv, D, D, true, 'kappaneel'));
      if (geo.some((g) => { const G = obb(g, 0); return staal.some((x) => x.B.some((q) => botsen(G, q))); })) continue;
      o.pronk.push(...geo); n++; break;
    }
  }
  if (n) b.koop('katrolkap', n, [], { naam: `Katrolkap ABS (2 schalen) op ${n} katrol${n > 1 ? 'len' : ''}`, groep: 'afwerking' });
}

/** naafkap: ABS-kap Ø90 op elk asuiteinde van een hefboom (beschermt de stelring, accentkleur) */
function naafKappen(b) {
  const o = b.o, staal = o.delen.filter((d) => d.kleur !== 'kap').map((d) => ({ d, B: d.geo.map((g) => obb(g, 0.5)) }));
  let n = 0;
  for (const p of o.pennen.filter((q) => q.factor === 'plateLoadedPen' && q.lengte)) {
    const sv = Math.abs(p.as[2]) > 0.9 ? [1, 0, 0] : norm(cross(p.as, [0, 0, 1]));
    for (const s of [-1, 1]) {
      const e = add(p.p, mul(p.as, s * (p.lengte / 2 + 1))), geo = [balk(e, add(e, mul(p.as, s * 14)), sv, 90, 90, true, 'accent'), balk(add(e, mul(p.as, s * 14)), add(e, mul(p.as, s * 17)), sv, 60, 60, true, 'eindkap')];
      const G = obb(geo[0], 0.5);
      if (staal.some((x) => x.B.some((q) => botsen(G, q)))) continue;
      o.pronk.push(...geo); n++;
    }
  }
  if (n) b.koop('naafkap', n, [], { naam: `Naafkap ABS Ø90 in de accentkleur op ${n} asuiteinde${n > 1 ? 'n' : ''}`, groep: 'afwerking' });
}
/** is het uiteinde e van staaf d vrij (geen ander stalen deel binnen 3 mm voorbij het uiteinde)? */
function vrijEinde(o, d, e, r) {
  const G = obb(balk(e, add(e, mul(r, 10)), d.v, d.P.b + 10, d.P.h + 10), 0);
  return !o.delen.some((x) => x !== d && x.geo.some((g) => botsen(G, obb(g, 0.3))));
}
/** rek-vormtaal (Rogue/Eleiko): kopplaat 8 mm met afgeschuinde hoeken op elke vrije staandertop, eindplaat 8 mm met
 *  ronde hoeken R15 op elk vrij uiteinde van een voetbalk, en een gelaserde zijplaat met naam op de zijligger */
function rekVorm(b, metNaam = true) {
  const o = b.o, t = 8;
  for (const d of [...o.delen]) {
    if (d.soort !== 'staaf' || d.pad || d.P.vorm !== 'koker' || !VAST.test(d.groep) && !/^Zijframe/.test(d.groep)) continue;
    const staat = Math.abs(d.u[2]) > 0.999, ligt = Math.abs(d.u[2]) < 1e-6 && Math.min(d.a[2], d.b[2]) - d.P.h / 2 < 5;
    if (staat) {
      const top = d.a[2] > d.b[2] ? d.a : d.b, k = 5, c = 6, hx = d.P.b / 2 + k, hy = d.P.h / 2 + k;
      if (!vrijEinde(o, d, top, [0, 0, 1])) continue;
      const pts = [[-hx + c, -hy], [hx - c, -hy], [hx, -hy + c], [hx, hy - c], [hx - c, hy], [-hx + c, hy], [-hx, hy - c], [-hx, -hy + c]];
      b.groep(d.groep);
      b.contour('Kopplaat', [top[0], top[1], top[2] + t / 2], d.v, cross(d.u[2] > 0 ? [0, 0, 1] : [0, 0, -1], d.v).map((x) => -x), t, pts, { opm: `kopplaat ${t} mm, gelaserd met afgeschuinde hoeken (${c} mm), ${k} mm overstek, rondom gelast en de rand gebroken`, banden: 4 });
    } else if (ligt && /voet/i.test(d.naam)) {
      for (const [e, r] of [[d.a, mul(d.u, -1)], [d.b, d.u]]) {
        if (!vrijEinde(o, d, e, r)) continue;
        const vz = Math.abs(d.v[2]) > 0.9, hx = (vz ? d.P.h : d.P.b) / 2 + 3, z0 = -(vz ? d.P.b : d.P.h) / 2, z1 = -z0 + 3, ex = norm(cross([0, 0, 1], r));
        b.groep(d.groep);
        b.contour('Eindplaat voet', add(e, mul(r, t / 2)), ex, [0, 0, 1], t, [[-hx, z0, 0], [hx, z0, 0], [hx, z1, 15], [-hx, z1, 15]], { opm: `eindplaat ${t} mm met ronde hoeken R15 boven, sluit de voetbalk (geen kunststof dop), rondom gelast`, banden: 4 });
      }
    }
  }
  // zijplaat met naam (gelaserd 3 mm, logo-uitsparing) op de buitenkant van een zijligger bovenaan
  const zl = o.delen.filter((d) => d.soort === 'staaf' && !d.pad && d.P.vorm === 'koker' && Math.abs(d.u[1]) > 0.999 && /Bovenligger zijkant|zijligger/i.test(d.naam)).sort((p, q) => q.L - p.L);
  const cx = o.delen.reduce((s2, d) => s2 + (d.geo[0].a[0] + d.geo[0].b[0]) / 2, 0) / Math.max(1, o.delen.length);
  let n = 0;
  for (const d of metNaam ? zl : []) {
    const m = mul(add(d.a, d.b), 0.5), sx = Math.sign(m[0] - cx) || 1, Lp = Math.round(Math.min(700, d.L - 120)), Wp = Math.round(d.P.h - 4 * d.P.t - 4);
    if (Lp < 300 || Wp < 34) continue;
    const c = [m[0] + sx * (d.P.b / 2 + 1.5), m[1], m[2]], geo = balk(add(c, [0, -Lp / 2, 0]), add(c, [0, Lp / 2, 0]), [0, 0, 1], Wp, 3);
    const G = obb(geo, -1);
    if (o.delen.some((x) => x !== d && x.geo.some((g) => botsen(G, obb(g, 0.2))))) continue;
    const [p0, p1] = [geo.a, geo.b].map((q, i) => q), mn = [Math.min(p0[0], p1[0]) - 1.5, Math.min(p0[1], p1[1]), m[2] - Wp / 2], mx = [Math.max(p0[0], p1[0]) + 1.5, Math.max(p0[1], p1[1]), m[2] + Wp / 2];
    b.groep('Zijplaat');
    b.plaat('Zijplaat met naam', mn, mx, { kleur: 'logo', in: d.id, laser: true, opm: `gelaserd 3 mm met de naam als uitsparing (placeholder), poedercoat in de accentkleur; met 3M VHB op ${d.naam.toLowerCase()} gekleefd` });
    n++;
  }
  if (n) b.koop('vhb', 1, [], { naam: `VHB-kleefband voor ${n} zijplaat${n > 1 ? 'en' : ''} met naam`, groep: 'afwerking' });
}
/** gelaserde logoplaat 3 mm (logo-uitsparing, placeholder) op een vaste koker van het frame, op VHB-tape (geen gaten):
 *  rek = voorkant van de hoogste dwarsligger; anders de buitenkant van de langste staander boven 1,35 m (het typeplaatje
 *  zit lager) of de zijkant van de langste ligger. Vrij van gaten, lassen en andere delen. */
function logoPlaat(b, def) {
  const o = b.o, t = 3, kand = o.delen.filter((d) => d.soort === 'staaf' && !d.pad && d.P.vorm === 'koker' && !d.P.ovaal && d.L >= 300 && VAST.test(d.groep) && asAs(d.u) >= 0 && Math.min(d.P.b, d.P.h) >= 40);
  const [mn0, mx0] = o.delen.reduce(([a, z], d) => { const [p, q] = aabb(d.geo[0]); return [a.map((x, i) => Math.min(x, p[i])), z.map((x, i) => Math.max(x, q[i]))]; }, [[Infinity, Infinity, Infinity], [-Infinity, -Infinity, -Infinity]]);
  const cx = (mn0[0] + mx0[0]) / 2;
  const liggend = kand.filter((d) => asAs(d.u) === 0).sort((p, q) => Math.max(q.a[2], q.b[2]) - Math.max(p.a[2], p.b[2]) || q.L - p.L);
  const staand = kand.filter((d) => asAs(d.u) === 2).sort((p, q) => q.L - p.L);
  const overig = kand.filter((d) => asAs(d.u) === 1).sort((p, q) => q.L - p.L);
  const volgorde = def.soort === 'rek' ? [...liggend, ...staand] : [...staand, ...liggend, ...overig];
  const anderen = [...o.delen.map((d) => ({ d, geo: d.geo })), ...o.kussens.map((d) => ({ d, geo: d.geo })), ...o.koop.filter((k) => k.geo.length).map((k) => ({ d: k, geo: k.geo }))];
  for (const d of volgorde) {
    const ui = asAs(d.u), m = mul(add(d.a, d.b), 0.5);
    const vlakken = [d.v, d.w, d.v.map((x) => -x), d.w.map((x) => -x)].map(as3).filter((n) => Math.abs(n[2]) < 0.5 && asAs(n) >= 0);
    const wens = ui === 0 ? [0, -1, 0] : Math.abs(m[0] - cx) > 30 ? [Math.sign(m[0] - cx), 0, 0] : [0, -1, 0];
    vlakken.sort((p, q) => dot(q, wens) - dot(p, wens));
    for (const n of vlakken.slice(0, 2)) {
      const opV = Math.abs(dot(n, d.v)) > 0.9, half = opV ? d.P.b / 2 : d.P.h / 2, breed = opV ? d.P.h : d.P.b;
      const Wp = Math.round(breed - 4 * d.P.t - 4), Lp = Math.round(Math.min(360, d.L * 0.42, Wp * 5));
      if (Wp < 34 || Lp < 150) continue;
      const doorVlak = (g) => Math.abs(dot(g.as === 'v' ? d.v : d.w, n)) > 0.9;
      const stappen = ui === 2 ? [0.82, 0.72, 0.62, 0.5] : [0.5, 0.35, 0.65, 0.25, 0.75];
      for (const f of stappen) {
        const s = d.L * f, s0 = s - Lp / 2, s1 = s + Lp / 2;
        if (s0 < 40 || s1 > d.L - 40) continue;
        const c = add(add(d.a, mul(d.u, s)), mul(n, half + t / 2 + 0.05));
        if (ui === 2 && c[2] - Lp / 2 < 1350) continue;
        if (d.gaten.some((g) => doorVlak(g) && g.s > s0 - 15 - g.d / 2 && g.s < s1 + 15 + g.d / 2) || d.westside) continue;
        const zij = norm(cross(n, d.u)), geo = balk(add(c, mul(d.u, -Lp / 2)), add(c, mul(d.u, Lp / 2)), zij, Wp, t);
        const G = obb(geo, -1.5);
        if (anderen.some((x) => x.d !== d && x.geo.some((g) => botsen(G, obb(g, 0.2))))) continue;
        const [p0, p1] = aabb(geo);
        b.groep('Logoplaat');
        b.plaat('Logoplaat', p0, p1, { kleur: 'logo', in: d.id, laser: true, opm: `gelaserd 3 mm S235 met logo-uitsparing (placeholder, logobestand volgt), poedercoat in de accentkleur; met 3M VHB-tape op ${d.naam.toLowerCase()} gekleefd (geen gaten in de koker)` });
        b.koop('vhb', 1, [], { naam: 'VHB-kleefband 3M 5952 voor de logoplaat', groep: 'afwerking' });
        o.logo = { deel: d.id, n, c };
        return;
      }
    }
  }
}
