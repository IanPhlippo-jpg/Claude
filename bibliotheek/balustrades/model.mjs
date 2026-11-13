// Het model van één balustrade: uit de keuzes (soort, stijl, vorm, maten, plaats, bevestiging) de lijn (recht, hoek, U
// of schuin langs een trap), de staanders (afstand uit de berekening of vrij), en elk stuk in 3D: staanders, handregel,
// onder- en bovenregel, spijlen, horizontale staven, platen, glas, glasklemmen, U-profiel, voetplaten en consoles.
// Coördinaten in mm: x, y in het grondvlak, z omhoog; de lijn begint in de oorsprong en loopt langs +x; de val-kant
// (vide, trapgat) ligt links (+N). Werkt in Node en in de browser.
import { PROFIEL, SOORTEN, STIJL, ANKER, RAND, GLASOPBOUW, PATROON } from './onderdelen.mjs';
import { NORM, vereisteHoogte, nietBeklimbaar } from './normen.mjs';
import { kiesStaander, kiesGlas, kiesAnkerU, plaatVoor } from './bereken.mjs';

export const STD = {
  soort: 'spijlen', stijl: 'S1', vorm: 'recht', plaats: 'binnen', L1: 4000, L2: 2500, L3: 2500, hoek: 90, optrede: 180, aantrede: 250,
  H: 1100, bevestiging: 'boven', anker: 'chemisch', cat: 'A', valhoogte: 3, afstand: 'auto', staander: 'auto', tussenruimte: 100,
  handregel: 'stijl', plint: true, glasTint: 'helder', glas: 'auto', ral: '7016', lak: 'fijnstructuur', vloerdikte: 280, plaatsen: true,
};
export const GRENZEN = { L: [600, 12000], H: [900, 1300], hoek: [60, 170], optrede: [140, 220], aantrede: [200, 340], afstand: [300, 2000], tussenruimte: [40, 150], vloerdikte: [180, 400] };
export const VORMEN = { recht: 'Recht', hoek: 'Met een hoek (L)', u: 'Twee hoeken (U)', trap: 'Langs een trap' };
const r1 = (v) => Math.round(v * 10) / 10;
const klem = (v, [a, b]) => Math.min(b, Math.max(a, v));
const add = (p, q, k = 1) => [p[0] + q[0] * k, p[1] + q[1] * k, p[2] + q[2] * k];
const deg = (r) => (r * 180) / Math.PI, rad = (g) => (g * Math.PI) / 180;

/** keuzes aanvullen en binnen de grenzen houden; geeft { k, meldingen } */
export function normaliseer(in0 = {}) {
  const k = { ...STD, ...in0 }, m = [];
  if (!SOORTEN[k.soort]) k.soort = STD.soort;
  const S = SOORTEN[k.soort];
  if (!S.stijlen.some((s) => s.id === k.stijl)) k.stijl = S.stijlen[0].id;
  for (const [veld, gr] of [['L1', GRENZEN.L], ['L2', GRENZEN.L], ['L3', GRENZEN.L], ['H', GRENZEN.H], ['hoek', GRENZEN.hoek], ['optrede', GRENZEN.optrede], ['aantrede', GRENZEN.aantrede], ['tussenruimte', GRENZEN.tussenruimte], ['vloerdikte', GRENZEN.vloerdikte]]) {
    const v = Number(k[veld]);
    const n = Number.isFinite(v) ? klem(Math.round(v), gr) : STD[veld];
    if (Number.isFinite(v) && n !== Math.round(v) && (veld !== 'L2' && veld !== 'L3' || k.vorm !== 'recht')) m.push(`${veld} aangepast tot ${n} (mogelijk ${gr[0]}-${gr[1]}).`);
    k[veld] = n;
  }
  if (k.vorm === 'trap') k.L2 = Number(in0.L2) === 0 ? 0 : k.L2; // trap zonder vide erachter
  if (!VORMEN[k.vorm]) k.vorm = 'recht';
  if (!['binnen', 'buiten'].includes(k.plaats)) k.plaats = 'binnen';
  if (!['boven', 'zij'].includes(k.bevestiging)) k.bevestiging = 'boven';
  if (!['chemisch', 'keil'].includes(k.anker)) k.anker = 'chemisch';
  if (!NORM.lijnlast[k.cat]) k.cat = 'A';
  const st = STIJL(k.soort, k.stijl);
  k.hr = k.handregel === 'stijl' || !S.handregels.includes(k.handregel) ? st.handregel : k.handregel;
  if (k.afstand !== 'auto') { const a = Number(k.afstand); k.afstand = Number.isFinite(a) ? klem(Math.round(a), GRENZEN.afstand) : 'auto'; }
  return { k, meldingen: m };
}

/** de lijn: segmenten met beginpunt, richting, horizontale lengte en helling */
export function segmenten(k) {
  const alfa = k.vorm === 'trap' ? Math.atan(k.optrede / k.aantrede) : 0;
  const def = k.vorm === 'recht' ? [[k.L1, 0, 0]] : k.vorm === 'hoek' ? [[k.L1, 0, 0], [k.L2, 180 - k.hoek, 0]] : k.vorm === 'u' ? [[k.L1, 0, 0], [k.L2, 180 - k.hoek, 0], [k.L3, 180 - k.hoek, 0]]
    : [[k.L1, 0, alfa], ...(k.L2 > 0 ? [[k.L2, 0, 0]] : [])];
  const segs = []; let p = [0, 0, 0], richting = 0;
  def.forEach(([L, draai, a], i) => {
    richting += rad(draai);
    const d = [Math.cos(richting), Math.sin(richting)], N = [-d[1], d[0], 0];
    const s = { i, p0: [...p], d: [d[0], d[1], 0], N, Lh: L, alfa: a, L3: L / Math.cos(a), draai: draai, T: [d[0] * Math.cos(a), d[1] * Math.cos(a), Math.sin(a)] };
    s.punt = (t) => [s.p0[0] + d[0] * t, s.p0[1] + d[1] * t, s.p0[2] + Math.tan(a) * t];
    segs.push(s); p = s.punt(L);
  });
  return segs;
}

/** de vaste maten in de hoogte (mm boven de vloerlijn of de trapneuslijn), per soort en handregel */
export function hoogtes(k, trap = false) {
  const hr = k.hr, H = k.H, onder = trap ? NORM.openingTrap.v : 70;
  const hrH = hr === 'rond' ? 42.4 : hr === 'plat' ? 8 : 0;
  const h = { H, hrH, onder };
  if (k.soort === 'glasU') { h.glasOnder = k.bevestiging === 'zij' ? -100 : 10; h.glasBoven = H - (hr === 'rond' ? 30 : 0); h.profiel = 110; return h; }
  if (k.soort === 'glasstaal') {
    h.staanderTop = hr === 'rond' ? H - 42.4 - 50 : H - 8;
    h.glasOnder = trap ? 50 : 80; h.glasBoven = (hr === 'rond' ? H - 42.4 - 50 : H - 8) - 60;
    return h;
  }
  h.staanderTop = H - hrH;
  h.bovenregel = hr === 'rond' ? [H - 42.4 - 70 - 20, H - 42.4 - 70] : null; // koker 40x20 onder de ronde handregel (opening 70)
  h.vulTop = h.bovenregel ? h.bovenregel[0] : H - hrH;
  h.onderregel = [onder, onder + 20];
  return h;
}

/** het hele ontwerp */
export function ontwerp(keuzes = {}) {
  const { k, meldingen } = normaliseer(keuzes);
  const S = SOORTEN[k.soort], st = STIJL(k.soort, k.stijl), segs = segmenten(k);
  const o = { k, S, st, segs, meldingen, staanders: [], delen: [], panelen: [], klemmen: [], platen: [], ankers: [], openingen: [], hoeken: 0, knikken: 0, lengte: segs.reduce((t, s) => t + s.L3, 0) };
  o.hoeken = segs.filter((s) => s.i > 0 && s.draai).length; o.knikken = segs.filter((s, i) => i > 0 && s.alfa !== segs[i - 1].alfa).length;
  o.trapLengte = segs.filter((s) => s.alfa).reduce((t, s) => t + s.L3, 0);
  o.vereist = vereisteHoogte(k); o.klim = nietBeklimbaar(k);
  if (k.vorm === 'trap') o.treden = Math.max(1, Math.round(segs[0].Lh / k.aantrede));
  const q = NORM.lijnlast[k.cat];
  if (k.soort === 'glasU') return glasU(o, q);
  // ---------------------------------------------------------------- staanders en hun afstand
  const keus = kiesStaander(k, segs);
  o.staander = keus; const P = PROFIEL[keus.prof];
  o.ankerType = keus.anker; o.voet = keus.voet;
  for (const s of segs) {
    const eerste = s.i === 0, laatste = s.i === segs.length - 1;
    const s0 = eerste ? P.b / 2 : 0, s1 = laatste ? s.Lh - P.b / 2 : s.Lh;
    const span3 = (s1 - s0) / Math.cos(s.alfa), n = Math.max(1, Math.ceil(span3 / keus.a - 1e-6));
    s.posten = Array.from({ length: n + 1 }, (_, j) => s0 + ((s1 - s0) * j) / n);
    s.veld3 = span3 / n; s.veldH = (s1 - s0) / n;
    s.posten.forEach((t, j) => { if (j === 0 && !eerste) return; o.staanders.push({ seg: s.i, t, p: s.punt(t), hoek: j === n && !laatste, eind: (eerste && j === 0) || (laatste && j === n) }); });
  }
  o.afstand = Math.max(...segs.map((s) => s.veld3));
  const h = hoogtes(k), zij = k.bevestiging === 'zij';
  const offN = zij ? 10 + 30 + P.h / 2 : 0; // zij: plaat 10 + afstandhouder 30 voor de vloerrand
  const NN = (s) => s.N;
  // staanders
  for (const [i, sp] of o.staanders.entries()) {
    const s = segs[sp.seg], hh = hoogtes(k, !!s.alfa), voet = add(sp.p, NN(s), offN);
    const z0 = zij ? -250 : o.voet.t, z1 = hh.staanderTop;
    const deel = { rol: 'staander', prof: keus.prof, a: [voet[0], voet[1], voet[2] + z0], b: [voet[0], voet[1], voet[2] + z1], zaag: [0, 0], zin: [1, 1], seg: s.i, N: s.N, cat: 'basis', nr: i };
    o.delen.push(deel);
    if (zij) {
      o.platen.push({ rol: 'console', seg: s.i, p: add(sp.p, s.N, 5), N: s.N, d: s.d, w: P.b + 60, h: 230, t: 10, z: [sp.p[2] - 250, sp.p[2] - 20], cat: 'zij', gaten: [[0, -60], [0, -190]] });
      for (const zz of [-90, -160]) o.delen.push({ rol: 'afstandhouder', prof: 'koker40x40x3', a: add(add(sp.p, s.N, 10), [0, 0, zz]), b: add(add(sp.p, s.N, 40), [0, 0, zz]), zaag: [0, 0], zin: [1, 1], seg: s.i, N: s.N, cat: 'zij', dwars: true });
    } else {
      const vp = o.voet;
      o.platen.push({ rol: 'voetplaat', seg: s.i, p: [...sp.p], N: s.N, d: s.d, w: vp.b, h: vp.l, t: vp.t, z: [sp.p[2], sp.p[2] + vp.t], cat: 'basis', gaten: vp.gaten });
    }
    for (const g of (zij ? [[0, -60], [0, -190]] : o.voet.gaten)) o.ankers.push({ p: zij ? add(add(sp.p, [0, 0, g[1]], 1), s.N, 0) : add(add(sp.p, s.d, g[0]), s.N, g[1]), richting: zij ? s.N.map((x) => -x) : [0, 0, -1], seg: s.i, zij });
    if (k.soort === 'glasstaal' && k.hr === 'rond') o.delen.push({ rol: 'drager', prof: 'koop', koop: 'handregeldrager', a: [voet[0], voet[1], voet[2] + z1], b: [voet[0], voet[1], voet[2] + z1 + 50], seg: s.i, N: s.N, cat: 'basis' });
  }
  // handregel per segment (verstek op de hoeken en de knik)
  const hrProf = k.hr === 'rond' ? (k.soort === 'glasstaal' ? 'inox42' : 'buis42') : 'plat50x8';
  for (const s of segs) {
    const eerste = s.i === 0, laatste = s.i === segs.length - 1, hh = hoogtes(k, !!s.alfa);
    const zc = hh.H - hh.hrH / 2; // hart van de handregel boven de lijn
    const a = add(add(s.punt(0), s.N, offN), [0, 0, zc]), b = add(add(s.punt(s.Lh), s.N, offN), [0, 0, zc]);
    const [verstekA, verstekB] = verstekken(segs, s);
    o.delen.push({ rol: 'handregel', prof: hrProf, a, b, zaag: [r1(verstekA), r1(verstekB)], zin: [1, 1], seg: s.i, N: s.N, cat: 'basis', vlakA: !eerste && (s.draai ? 'plan' : 'helling'), vlakB: !laatste && (segs[s.i + 1].draai ? 'plan' : 'helling') });
  }
  // de vulling per veld
  for (const s of segs) {
    const hh = hoogtes(k, !!s.alfa), helling = deg(s.alfa), cat = s.alfa ? 'trap' : 'basis';
    for (let j = 0; j < s.posten.length - 1; j++) {
      const ta = s.posten[j] + P.b / 2, tb = s.posten[j + 1] - P.b / 2, wH = tb - ta; // vrije breedte (horizontaal)
      const pa = (z) => add(add(s.punt(ta), s.N, offN), [0, 0, z]), pb = (z) => add(add(s.punt(tb), s.N, offN), [0, 0, z]);
      const veld = { seg: s.i, j, wH, ta, tb };
      if (k.soort === 'spijlen') vulSpijlen(o, k, s, veld, hh, pa, pb, helling, cat, offN);
      else if (k.soort === 'staven') vulStaven(o, k, s, veld, hh, pa, pb, helling, cat, offN, st);
      else vulGlas(o, k, s, veld, hh, pa, pb, helling, offN);
    }
  }
  // openingen tussen de staander en de vulling, en onderaan
  o.openingen.push({ wat: k.soort === 'glasstaal' ? 'onder het glas' : plintAan(k, o) ? 'onder de plint' : 'onder de onderregel', mm: k.soort === 'glasstaal' ? hoogtes(k).glasOnder : plintAan(k, o) ? 50 : hoogtes(k).onder, max: NORM.opening.v });
  // gaten voor de glasklemmen (blindklinkmoer M8) in de staander waar de klem zit
  for (const kl of o.klemmen) {
    let best = null, bd = Infinity;
    for (const d of o.delen) if (d.rol === 'staander') { const dd = Math.hypot(d.a[0] - kl.p[0], d.a[1] - kl.p[1]); if (dd < bd) { bd = dd; best = d; } }
    if (best) (best.gaten ??= []).push({ z: Math.round(kl.p[2] - best.a[2]), kant: kl.d });
  }
  if (k.vorm === 'trap') o.openingen.push({ wat: 'trapneus tot de onderste regel (trap)', mm: hoogtes(k, true).onder, max: NORM.openingTrap.v, trap: true });
  o.glas = k.soort === 'glasstaal' ? kiesGlas(k) : null;
  o.openingen = uniek(o.openingen);
  return o;
}
/** aantal spijlen of staven in een ruimte W: tot 110 mm nooit groter dan de gekozen tussenruimte; daarboven (bewust te
 *  groot) nooit kleiner, zodat de berekening het toont */
const aantal = (W, d, g) => Math.max(1, g <= NORM.opening.v ? Math.ceil((W - g) / (d + g) - 1e-9) : Math.floor((W - g) / (d + g) + 1e-9));
/** per soort opening alleen de grootste (de vulling geeft er één per veld) */
const uniek = (lijst) => { const m = new Map(); for (const x of lijst) { const y = m.get(x.wat); if (!y || x.mm > y.mm) m.set(x.wat, x); } return [...m.values()]; };
const plintAan = (k, o) => k.plint !== false && o.klim && STIJL(k.soort, k.stijl).vulling === 'staven';

function vulSpijlen(o, k, s, veld, hh, pa, pb, helling, cat, offN) {
  const sp = o.st.spijl, P = PROFIEL[sp], d = P.b, gDoel = Math.min(o.st.gat ?? k.tussenruimte, k.tussenruimte);
  // onderregel en (bij een ronde handregel) bovenregel, tussen de staanders; schuin langs de trap
  const regel = (z0, z1, naam) => o.delen.push({ rol: naam, prof: 'koker40x20x2', a: pa((z0 + z1) / 2), b: pb((z0 + z1) / 2), zaag: [helling, helling], zin: [1, -1], seg: s.i, N: s.N, cat });
  regel(...hh.onderregel, 'onderregel');
  if (hh.bovenregel) regel(...hh.bovenregel, 'bovenregel');
  const n = aantal(veld.wH, d, gDoel), gat = (veld.wH - n * d) / (n + 1);
  for (let i = 0; i < n; i++) {
    const t = veld.ta + gat * (i + 1) + d * i + d / 2, voet = add(s.punt(t), s.N, offN);
    o.delen.push({ rol: 'spijl', prof: sp, a: add(voet, [0, 0, hh.onderregel[1]]), b: add(voet, [0, 0, hh.vulTop]), zaag: [helling, helling], zin: [1, -1], seg: s.i, N: s.N, cat });
  }
  o.openingen.push({ wat: 'tussen de spijlen', mm: r1(gat), max: NORM.opening.v, seg: s.i });
  if (hh.bovenregel) o.openingen.push({ wat: 'tussen de handregel en de bovenregel', mm: 70, max: NORM.opening.v });
}

function vulStaven(o, k, s, veld, hh, pa, pb, helling, cat, offN, st) {
  const plint = plintAan(k, o), top = hh.vulTop;
  if (st.vulling === 'plaat') {
    o.delen.push({ rol: 'onderregel', prof: 'koker40x20x2', a: pa(hh.onderregel[0] + 10), b: pb(hh.onderregel[0] + 10), zaag: [helling, helling], zin: [1, -1], seg: s.i, N: s.N, cat });
    const z0 = hh.onderregel[1], w = veld.wH - 4;
    o.panelen.push({ rol: 'plaat', patroon: st.patroon, pts: [pa(z0), pb(z0), pb(top), pa(top)].map((p, i) => add(p, s.d, i === 0 || i === 3 ? 2 : -2)), dikte: 3, seg: s.i, N: s.N, w, h: top - z0, helling, cat });
    const pat = PATROON[st.patroon];
    o.klimPatroon = pat.klim;
    if (pat.klim > NORM.klimZone.max) o.openingen.push({ wat: `opstap in de plaat (${pat.naam}) tussen ${NORM.klimZone.van} en ${NORM.klimZone.tot} mm`, mm: pat.klim, max: NORM.klimZone.max, klim: true });
    return;
  }
  const P = PROFIEL[st.staaf], tb = P.b, g = k.tussenruimte;
  let zb = 0;
  if (plint) {
    o.panelen.push({ rol: 'plint', patroon: 'vlak', pts: [pa(50), pb(50), pb(NORM.klimZone.tot), pa(NORM.klimZone.tot)].map((p, i) => add(p, s.d, i === 0 || i === 3 ? 2 : -2)), dikte: 3, seg: s.i, N: s.N, w: veld.wH - 4, h: NORM.klimZone.tot - 50, helling, cat });
    zb = NORM.klimZone.tot;
  }
  const n = aantal(top - zb, tb, g), gat = (top - zb - n * tb) / (n + 1);
  for (let i = 0; i < n; i++) { const z = zb + gat * (i + 1) + tb * i + tb / 2; o.delen.push({ rol: 'staaf', prof: st.staaf, a: pa(z), b: pb(z), zaag: [helling, helling], zin: [1, -1], seg: s.i, N: s.N, cat }); }
  o.openingen.push({ wat: 'tussen de horizontale staven (verticaal gemeten)', mm: r1(gat), max: NORM.opening.v, seg: s.i });
  if (!plint) o.openingen.push({ wat: `horizontale staven in de zone ${NORM.klimZone.van}-${NORM.klimZone.tot} mm (opstap)`, mm: r1(gat), max: NORM.klimZone.max, klim: true });
}

function vulGlas(o, k, s, veld, hh, pa, pb, helling, offN) {
  const g = kiesGlas(k), spel = 12, cat = s.alfa ? 'trap' : 'glas';
  const pts = [pa(hh.glasOnder), pb(hh.glasOnder), pb(hh.glasBoven), pa(hh.glasBoven)].map((p, i) => add(p, s.d, i === 0 || i === 3 ? spel : -spel));
  o.panelen.push({ rol: 'glas', opbouw: g.opbouw, pts, dikte: GLASOPBOUW[g.opbouw].dikte, seg: s.i, N: s.N, w: veld.wH - 2 * spel, h: hh.glasBoven - hh.glasOnder, helling, cat: 'glas', vorm: s.alfa ? 'parallellogram' : 'rechthoek' });
  const klem = o.k.soort === 'glasstaal' && STIJL(k.soort, k.stijl).staander === 'inox' ? 'klemRond' : 'klemVlak';
  for (const z of [hh.glasOnder + 120, hh.glasBoven - 120]) for (const [t, zin] of [[veld.ta, 1], [veld.tb, -1]]) o.klemmen.push({ p: add(add(s.punt(t), s.N, offN), [0, 0, z]), d: s.d.map((x) => x * zin), N: s.N, koop: klem, seg: s.i });
  o.openingen.push({ wat: 'tussen het glas en de handregel', mm: 60, max: NORM.opening.v });
  o.openingen.push({ wat: 'tussen het glas en de staander', mm: spel, max: NORM.opening.v });
}

/** volglas in een U-profiel: profiel per segment, ankers om de 125-250 mm, glasplaten tot 1200 breed */
function glasU(o, q) {
  const k = o.k, segs = o.segs, g = kiesGlas(k), au = kiesAnkerU(k);
  o.glas = g; o.ankerType = au.anker; o.ankerAfstand = au.afstand; o.afstand = au.afstand;
  const hh = hoogtes(k), zij = k.bevestiging === 'zij', off = zij ? 45 : 0;
  for (const s of segs) {
    const [vA, vB] = verstekken(segs, s);
    const zc = zij ? -55 : 55;
    o.delen.push({ rol: 'uprofiel', prof: 'koop', koop: zij ? 'qrZij' : 'qrTop', a: add(add(s.punt(0), s.N, off), [0, 0, zc]), b: add(add(s.punt(s.Lh), s.N, off), [0, 0, zc]), zaag: [r1(vA), r1(vB)], zin: [1, 1], seg: s.i, N: s.N, cat: s.alfa ? 'trap' : 'basis', L: s.L3 });
    // ankers
    const n = Math.max(2, Math.ceil((s.Lh - 100) / au.afstand) + 1);
    for (let j = 0; j < n; j++) { const t = 50 + ((s.Lh - 100) * j) / (n - 1); o.ankers.push({ p: zij ? add(s.punt(t), [0, 0, -60], 1) : s.punt(t), richting: zij ? s.N.map((x) => -x) : [0, 0, -1], seg: s.i, zij }); }
    // glasplaten: gelijk verdeeld, voeg 8 mm, tot 1200 breed
    const spel = 8, np = Math.max(1, Math.ceil((s.Lh - 2 * spel) / (1200 + spel))), w = (s.Lh - (np + 1) * spel) / np;
    for (let j = 0; j < np; j++) {
      const ta = spel + j * (w + spel), tb = ta + w, pa = (z) => add(add(s.punt(ta), s.N, off), [0, 0, z]), pb = (z) => add(add(s.punt(tb), s.N, off), [0, 0, z]);
      o.panelen.push({ rol: 'glas', opbouw: g.opbouw, pts: [pa(hh.glasOnder), pb(hh.glasOnder), pb(hh.glasBoven), pa(hh.glasBoven)], dikte: GLASOPBOUW[g.opbouw].dikte, seg: s.i, N: s.N, w, h: hh.glasBoven - hh.glasOnder, helling: deg(s.alfa), cat: 'glas', vorm: s.alfa ? 'parallellogram' : 'rechthoek' });
    }
    if (k.hr === 'rond') o.delen.push({ rol: 'handregel', prof: 'koop', koop: 'qrHandregel', a: add(add(s.punt(0), s.N, off), [0, 0, hh.H - 21]), b: add(add(s.punt(s.Lh), s.N, off), [0, 0, hh.H - 21]), zaag: [r1(vA), r1(vB)], zin: [1, 1], seg: s.i, N: s.N, cat: 'basis', L: s.L3 });
  }
  o.openingen.push({ wat: 'onder het glas (in het profiel)', mm: 0, max: NORM.opening.v });
  o.openingen.push({ wat: 'voeg tussen de glasplaten', mm: 8, max: NORM.opening.v });
  o.staanders = []; o.openingen = uniek(o.openingen);
  return o;
}

/** verstek aan het begin en het einde van een segment (graden): half de draai in het grondvlak of half de knik in de helling */
function verstekken(segs, s) {
  const v = segs[s.i - 1], n = segs[s.i + 1];
  const a = !v ? 0 : s.draai ? s.draai / 2 : deg(Math.abs(s.alfa - v.alfa)) / 2, b = !n ? 0 : n.draai ? n.draai / 2 : deg(Math.abs(n.alfa - s.alfa)) / 2;
  return [r1(a), r1(b)];
}

/** lengte van een lineair deel: hart en lange kant (verstek of schuin) */
export function lengtes(d) {
  if (d.L) return { hart: d.L, lang: d.L };
  const hart = Math.hypot(d.b[0] - d.a[0], d.b[1] - d.a[1], d.b[2] - d.a[2]);
  const P = PROFIEL[d.prof] ?? { h: 0, b: 0 };
  const dim = d.rol === 'handregel' ? (d.vlakA === 'plan' || d.vlakB === 'plan' ? P.h : P.b) : d.rol === 'spijl' || d.rol === 'staaf' || /regel/.test(d.rol) ? P.b : P.b;
  const e = (d.zaag ?? [0, 0]).map((f, i) => (d.zin?.[i] ?? 1) * (dim / 2) * Math.tan(rad(f)));
  return { hart, lang: hart + Math.abs(e[0] + e[1]) };
}
export { ANKER, RAND };
