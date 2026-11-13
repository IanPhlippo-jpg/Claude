// Het model van één balustrade: uit de keuzes (soort, stijl, vorm, maten, plaats, bevestiging) de lijn (recht, hoek, U
// of schuin langs een trap), de staanders (afstand uit de berekening of vrij), en elk stuk in 3D: staanders, handregel,
// onder- en bovenregel, spijlen, horizontale staven, platen, glas, glasklemmen, U-profiel, voetplaten en consoles.
// Onder een schuin dak kan het begin en/of het einde afgeschuind worden: de handregel volgt het dak (met een knik waar
// hij horizontaal wordt), de staanders, spijlen, staven, platen en het glas worden lager of schuin.
// Coördinaten in mm: x, y in het grondvlak, z omhoog; de lijn begint in de oorsprong en loopt langs +x; de val-kant
// (vide, trapgat) ligt links (+N). Werkt in Node en in de browser.
import { PROFIEL, SOORTEN, STIJL, ANKER, RAND, GLASOPBOUW, PATROON } from './onderdelen.mjs';
import { NORM, vereisteHoogte, nietBeklimbaar } from './normen.mjs';
import { kiesStaander, kiesGlas, kiesAnkerU, plaatVoor } from './bereken.mjs';

export const STD = {
  soort: 'spijlen', stijl: 'S1', vorm: 'recht', plaats: 'binnen', L1: 4000, L2: 2500, L3: 2500, hoek: 90, optrede: 180, aantrede: 250,
  H: 1100, bevestiging: 'boven', anker: 'chemisch', cat: 'A', valhoogte: 3, afstand: 'auto', staander: 'auto', tussenruimte: 100,
  handregel: 'stijl', plint: true, glasTint: 'helder', glas: 'auto', ral: '7016', lak: 'fijnstructuur', vloerdikte: 280, plaatsen: true,
  // onder een schuin dak: per uiteinde aan/uit, dakhelling (°), hoogte onder het dak aan de muur (mm), spleet loodrecht op het dak (mm)
  dakBegin: false, dakBeginHelling: 45, dakBeginMuur: 600, dakBeginSpleet: 40,
  dakEind: false, dakEindHelling: 45, dakEindMuur: 600, dakEindSpleet: 40,
};
export const GRENZEN = { L: [600, 12000], H: [900, 1300], hoek: [60, 170], optrede: [140, 220], aantrede: [200, 340], afstand: [300, 2000], tussenruimte: [40, 150], vloerdikte: [180, 400], helling: [15, 60], muur: [0, 2500], spleet: [10, 150] };
export const VORMEN = { recht: 'Recht', hoek: 'Met een hoek (L)', u: 'Twee hoeken (U)', trap: 'Langs een trap' };
/** muurplaat aan een laag uiteinde onder het dak: lasergesneden 80 x h x 8, 2 ankers M10 in het knieschot */
export const MUURPLAAT = { b: 80, t: 8, onder: 20 };
const r1 = (v) => Math.round(v * 10) / 10;
const klem = (v, [a, b]) => Math.min(b, Math.max(a, v));
const add = (p, q, k = 1) => [p[0] + q[0] * k, p[1] + q[1] * k, p[2] + q[2] * k];
const deg = (r) => (r * 180) / Math.PI, rad = (g) => (g * Math.PI) / 180;
const DAKVELD = [['Helling', 'helling'], ['Muur', 'muur'], ['Spleet', 'spleet']];

/** keuzes aanvullen en binnen de grenzen houden; geeft { k, meldingen } */
export function normaliseer(in0 = {}) {
  const k = { ...STD, ...in0 }, m = [];
  if (!SOORTEN[k.soort]) k.soort = STD.soort;
  const S = SOORTEN[k.soort];
  if (!S.stijlen.some((s) => s.id === k.stijl)) k.stijl = S.stijlen[0].id;
  const velden = [['L1', GRENZEN.L], ['L2', GRENZEN.L], ['L3', GRENZEN.L], ['H', GRENZEN.H], ['hoek', GRENZEN.hoek], ['optrede', GRENZEN.optrede], ['aantrede', GRENZEN.aantrede], ['tussenruimte', GRENZEN.tussenruimte], ['vloerdikte', GRENZEN.vloerdikte]];
  for (const e of ['dakBegin', 'dakEind']) for (const [n, g] of DAKVELD) velden.push([e + n, GRENZEN[g]]);
  for (const [veld, gr] of velden) {
    const v = Number(k[veld]);
    const n = Number.isFinite(v) ? klem(Math.round(v), gr) : STD[veld];
    const dakUit = /^dak(Begin|Eind)/.test(veld) && !k[veld.startsWith('dakBegin') ? 'dakBegin' : 'dakEind'];
    if (Number.isFinite(v) && n !== Math.round(v) && (veld !== 'L2' && veld !== 'L3' || k.vorm !== 'recht') && !dakUit) m.push(`${veld} aangepast tot ${n} (mogelijk ${gr[0]}-${gr[1]}).`);
    k[veld] = n;
  }
  if (k.vorm === 'trap') k.L2 = Number(in0.L2) === 0 ? 0 : k.L2; // trap zonder vide erachter
  if (!VORMEN[k.vorm]) k.vorm = 'recht';
  for (const e of ['dakBegin', 'dakEind']) k[e] = k[e] === true || k[e] === 'true' || k[e] === 1;
  if (k.vorm === 'trap') {
    // langs een trap kan alleen het einde (de vide na de trap) onder het dak liggen: zie EISEN.md
    if (k.dakBegin) { m.push('Langs een trap kan alleen het einde (de vide na de trap) onder een schuin dak afgeschuind worden; het begin is uitgezet.'); k.dakBegin = false; }
    if (k.dakEind && !(k.L2 > 0)) { m.push('Een trap zonder vide erna kan niet onder een schuin dak afgeschuind worden; de afschuining is uitgezet.'); k.dakEind = false; }
  }
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

/**
 * de afschuiningen onder het dak: per uiteinde de helling θ, de hoogte onder het dak aan de muur, de spleet (loodrecht
 * op het dak), de horizontale lengte van het schuine stuk xs (waar het dak H + spleet bereikt, bovenkant handregel), de
 * knik op het hart van de handregel xk, de hoogte aan de muur, of het past en of er een muurplaat komt
 */
export function dakEinden(k, segs) {
  const hrH = hoogtes(k).hrH, uit = [];
  for (const kant of ['begin', 'eind']) {
    const K = kant === 'begin' ? 'dakBegin' : 'dakEind';
    if (!k[K]) continue;
    const s = kant === 'begin' ? segs[0] : segs[segs.length - 1];
    const th = rad(k[K + 'Helling']), c = Math.cos(th), tn = Math.tan(th), muur = k[K + 'Muur'], spleet = k[K + 'Spleet'];
    const xs = (k.H + spleet / c - muur) / tn; // de bovenkant van de balustrade bereikt H
    const top0 = muur - spleet / c; // bovenkant aan de muur
    const topWand = Math.max(top0, NORM.dakWand.v); // te laag: geklemd (en rood in de berekening)
    const z0h = topWand - hrH / (2 * c); // hart van de handregel aan de muur
    const xk = (k.H - hrH / 2 - z0h) / tn; // knik op het hart
    uit.push({ kant, sleutel: K, seg: s.i, hoek: k[K + 'Helling'], th, c, tn, muur, spleet, xs, xk, top0, topWand, z0h, hrH, nodig: xs > 1 && xk > 1, verticaal: spleet / c });
  }
  for (const e of uit) {
    const s = segs[e.seg], ander = uit.find((x) => x !== e && x.seg === e.seg && x.nodig);
    const som = e.xs + (ander ? ander.xs : 0), max = s.Lh - NORM.dakVlak.v;
    e.beschikbaar = max - (ander ? ander.xs : 0);
    e.past = !e.nodig || som <= max;
    const f = e.past ? 1 : max / som;
    e.xkE = Math.max(1, e.xk * f); // past het niet, dan wordt het schuine stuk korter en steiler (rood)
    e.tanE = e.nodig ? (k.H - hrH / 2 - e.z0h) / e.xkE : e.tn; e.thE = Math.atan(e.tanE); e.cE = Math.cos(e.thE);
    e.muurplaat = e.nodig && k.soort !== 'glasU' && e.topWand < NORM.dakStaander.v;
    // waar de onderkant van de handregel horizontaal wordt (binnenhoek van de knik), en waar het dak H + 110 bereikt
    e.xOnder = (k.H - hrH + hrH / (2 * e.cE) - e.z0h) / e.tanE;
    e.x110 = (k.H + NORM.dakVolleHoogte.v / e.c - e.muur) / e.tn;
    e.tKnik = e.kant === 'begin' ? e.xkE : s.Lh - e.xkE;
  }
  return uit;
}

/**
 * verlaging op t in segment s door de afschuiningen: v = hoe veel de onderkant van de handregel lager ligt dan
 * normaal (H - hrH), d = hoe veel het hart lager ligt, th = de helling (°), sig = +1 als de onderkant stijgt met t
 */
export function verlaging(o, s, t) {
  let v = 0, d = 0, th = 0, sig = 0;
  for (const e of o.dak ?? []) {
    if (!e.nodig || e.seg !== s.i) continue;
    const x = e.kant === 'begin' ? t : s.Lh - t, hart = e.z0h + x * e.tanE, H = o.k.H;
    const dv = (H - e.hrH) - (hart - e.hrH / (2 * e.cE)), dd = (H - e.hrH / 2) - hart;
    if (dv > v) { v = dv; th = deg(e.thE); sig = e.kant === 'begin' ? 1 : -1; }
    if (dd > d) d = dd;
  }
  return { v, d, th, sig };
}
/** de t-waarden in segment s waar de verlaging knikt (binnenhoek van de handregel) */
const knikT = (o, s) => (o.dak ?? []).filter((e) => e.nodig && e.seg === s.i).map((e) => (e.kant === 'begin' ? e.xOnder : s.Lh - e.xOnder));
/** normaal van het schuine snijvlak (onderkant van de handregel) op t, of null */
const snijDak = (s, vl) => (vl.v > 0.05 ? [-vl.sig * Math.tan(rad(vl.th)) * s.d[0], -vl.sig * Math.tan(rad(vl.th)) * s.d[1], 1] : null);
/** een stuklijn [t, z] van ta tot tb voor een stuksgewijs lineaire f, met de knikken en (optioneel) de snijpunten met 'niveau' */
function stuklijn(ts0, ta, tb, f, niveau = null, g = null, vereenvoudig = true) {
  let ts = [ta, ...ts0.filter((t) => t > ta + 0.5 && t < tb - 0.5), tb].sort((a, b) => a - b);
  if (niveau != null) {
    const extra = [];
    for (let i = 0; i < ts.length - 1; i++) { const a = g(ts[i]) - niveau, b = g(ts[i + 1]) - niveau; if (a * b < 0) extra.push(ts[i] + ((ts[i + 1] - ts[i]) * a) / (a - b)); }
    ts = [...ts, ...extra].sort((a, b) => a - b);
  }
  const pts = ts.map((t) => [t, f(t)]);
  if (!vereenvoudig) return pts;
  // punten op een rechte lijn weglaten
  return pts.filter((p, i) => i === 0 || i === pts.length - 1 || Math.abs((pts[i + 1][1] - pts[i - 1][1]) * (p[0] - pts[i - 1][0]) - (p[1] - pts[i - 1][1]) * (pts[i + 1][0] - pts[i - 1][0])) > 1e-3 * (pts[i + 1][0] - pts[i - 1][0]));
}
/** een vlak paneel tussen ta en tb, van z0 tot een (schuine) bovenrand; uv = de omtrek in het vlak (u langs de lijn) */
function paneelVorm(s, offN, z0, boven) {
  const P = (t, z) => add(add(s.punt(t), s.N, offN), [0, 0, z]);
  const ta = boven[0][0], tb = boven[boven.length - 1][0];
  const pts = [P(ta, z0), P(tb, z0), ...boven.slice().reverse().map(([t, z]) => P(t, z))];
  const hs = boven.map(([, z]) => z - z0), recht = boven.length === 2 && Math.abs(hs[0] - hs[1]) < 0.5;
  const uv = recht ? null : [[0, 0], [tb - ta, 0], ...boven.slice().reverse().map(([t, z]) => [t - ta, z - z0])];
  return { pts, uv, w: tb - ta, h: Math.max(...hs), hA: hs[0], hB: hs[hs.length - 1] };
}

/** het hele ontwerp */
export function ontwerp(keuzes = {}) {
  const { k, meldingen } = normaliseer(keuzes);
  const S = SOORTEN[k.soort], st = STIJL(k.soort, k.stijl), segs = segmenten(k);
  const o = { k, S, st, segs, meldingen, staanders: [], delen: [], panelen: [], klemmen: [], platen: [], ankers: [], muurAnkers: [], openingen: [], hoeken: 0, knikken: 0, lengte: segs.reduce((t, s) => t + s.L3, 0) };
  o.hoeken = segs.filter((s) => s.i > 0 && s.draai).length; o.knikken = segs.filter((s, i) => i > 0 && s.alfa !== segs[i - 1].alfa).length;
  o.trapLengte = segs.filter((s) => s.alfa).reduce((t, s) => t + s.L3, 0);
  o.vereist = vereisteHoogte(k); o.klim = nietBeklimbaar(k);
  if (k.vorm === 'trap') o.treden = Math.max(1, Math.round(segs[0].Lh / k.aantrede));
  o.dak = dakEinden(k, segs); o.dakKnikken = o.dak.filter((e) => e.nodig).length;
  for (const e of o.dak) if (!e.nodig) meldingen.push(`${e.kant === 'begin' ? 'Begin' : 'Einde'}: het dak staat aan de muur al hoog genoeg (${e.muur} mm ≥ H + spleet); er is geen afschuining nodig.`);
  o.vl = (s, t) => verlaging(o, s, t);
  const q = NORM.lijnlast[k.cat];
  if (k.soort === 'glasU') return glasU(o, q);
  // ---------------------------------------------------------------- staanders en hun afstand
  const keus = kiesStaander(k, segs);
  o.staander = keus; const P = PROFIEL[keus.prof];
  o.ankerType = keus.anker; o.voet = keus.voet;
  const zij = k.bevestiging === 'zij';
  const tWand = zij ? P.b / 2 : Math.max(P.b / 2, keus.voet.b / 2 + 5); // eindstaander tegen het knieschot: de voetplaat blijft uit de muur
  for (const s of segs) {
    const eerste = s.i === 0, laatste = s.i === segs.length - 1;
    const eA = eerste ? o.dak.find((e) => e.nodig && e.kant === 'begin') : null, eB = laatste ? o.dak.find((e) => e.nodig && e.kant === 'eind') : null;
    const begin = eA?.muurplaat ? { t: MUURPLAAT.t / 2, w: MUURPLAAT.t, muur: true } : { t: eerste ? (eA ? tWand : P.b / 2) : 0, w: P.b };
    const einde = eB?.muurplaat ? { t: s.Lh - MUURPLAAT.t / 2, w: MUURPLAAT.t, muur: true } : { t: laatste ? s.Lh - (eB ? tWand : P.b / 2) : s.Lh, w: P.b };
    // een staander onder elke knik van de handregel (als er plaats is)
    const vast = [begin];
    for (const e of [eA, eB].filter(Boolean).sort((a, b) => a.tKnik - b.tKnik)) {
      const v = vast[vast.length - 1];
      if (e.tKnik - v.t >= (v.w + P.b) / 2 + 60 && einde.t - e.tKnik >= (einde.w + P.b) / 2 + 60) vast.push({ t: e.tKnik, w: P.b, knik: true });
    }
    vast.push(einde);
    const alle = [vast[0]];
    for (let i = 1; i < vast.length; i++) {
      const a = vast[i - 1], b = vast[i], span3 = (b.t - a.t) / Math.cos(s.alfa), n = Math.max(1, Math.ceil(span3 / keus.a - 1e-6));
      for (let j = 1; j <= n; j++) alle.push(j === n ? b : { t: a.t + ((b.t - a.t) * j) / n, w: P.b });
    }
    s.steunen = alle; s.posten = alle.map((x) => x.t);
    s.velden = alle.slice(1).map((b, j) => ({ ta: alle[j].t + alle[j].w / 2, tb: b.t - b.w / 2, muurA: !!alle[j].muur, muurB: !!b.muur }));
    s.veld3 = Math.max(...alle.slice(1).map((b, j) => (b.t - alle[j].t) / Math.cos(s.alfa))); s.veldH = Math.max(...alle.slice(1).map((b, j) => b.t - alle[j].t));
    alle.forEach((x, j) => { if ((j === 0 && !eerste) || x.muur) return; o.staanders.push({ seg: s.i, t: x.t, p: s.punt(x.t), hoek: j === alle.length - 1 && !laatste, eind: (eerste && j === 0) || (laatste && j === alle.length - 1), knik: !!x.knik, wand: (eA && eerste && j === 0) || (eB && laatste && j === alle.length - 1) }); });
  }
  o.afstand = Math.max(...segs.map((s) => s.veld3));
  const h = hoogtes(k);
  const offN = zij ? 10 + 30 + P.h / 2 : 0; // zij: plaat 10 + afstandhouder 30 voor de vloerrand
  o.offN = offN;
  const NN = (s) => s.N;
  // staanders
  for (const [i, sp] of o.staanders.entries()) {
    const s = segs[sp.seg], hh = hoogtes(k, !!s.alfa), voet = add(sp.p, NN(s), offN), vl = o.vl(s, sp.t);
    const drager = k.soort === 'glasstaal' && k.hr === 'rond';
    const z0 = zij ? -250 : o.voet.t, z1 = hh.staanderTop - vl.v;
    const schuin = vl.v > 0.5 && !drager && !sp.knik;
    const deel = { rol: 'staander', prof: keus.prof, a: [voet[0], voet[1], voet[2] + z0], b: [voet[0], voet[1], voet[2] + z1], zaag: [0, schuin ? r1(vl.th) : 0], zin: [1, 1], seg: s.i, N: s.N, cat: 'basis', nr: i, ...(schuin ? { snijB: snijDak(s, vl), dak: { hoek: r1(vl.th) } } : {}) };
    o.delen.push(deel);
    if (zij) {
      o.platen.push({ rol: 'console', seg: s.i, p: add(sp.p, s.N, 5), N: s.N, d: s.d, w: P.b + 60, h: 230, t: 10, z: [sp.p[2] - 250, sp.p[2] - 20], cat: 'zij', gaten: [[0, -60], [0, -190]] });
      for (const zz of [-90, -160]) o.delen.push({ rol: 'afstandhouder', prof: 'koker40x40x3', a: add(add(sp.p, s.N, 10), [0, 0, zz]), b: add(add(sp.p, s.N, 40), [0, 0, zz]), zaag: [0, 0], zin: [1, 1], seg: s.i, N: s.N, cat: 'zij', dwars: true });
    } else {
      const vp = o.voet;
      o.platen.push({ rol: 'voetplaat', seg: s.i, p: [...sp.p], N: s.N, d: s.d, w: vp.b, h: vp.l, t: vp.t, z: [sp.p[2], sp.p[2] + vp.t], cat: 'basis', gaten: vp.gaten });
    }
    for (const g of (zij ? [[0, -60], [0, -190]] : o.voet.gaten)) o.ankers.push({ p: zij ? add(add(sp.p, [0, 0, g[1]], 1), s.N, 0) : add(add(sp.p, s.d, g[0]), s.N, g[1]), richting: zij ? s.N.map((x) => -x) : [0, 0, -1], seg: s.i, zij });
    if (drager) o.delen.push({ rol: 'drager', prof: 'koop', koop: 'handregeldrager', a: [voet[0], voet[1], voet[2] + z1], b: [voet[0], voet[1], voet[2] + z1 + 50], seg: s.i, N: s.N, cat: 'basis' });
  }
  // handregel per segment (verstek op de hoeken en de knik van de trap; onder het dak een knik waar hij horizontaal wordt)
  const hrProf = k.hr === 'rond' ? (k.soort === 'glasstaal' ? 'inox42' : 'buis42') : 'plat50x8';
  for (const s of segs) handregel(o, s, (t) => hoogtes(k, !!s.alfa).H - hoogtes(k, !!s.alfa).hrH / 2 - o.vl(s, t).d, offN, { prof: hrProf });
  // muurplaten aan de lage uiteinden
  for (const e of o.dak.filter((x) => x.muurplaat)) muurplaat(o, e, offN);
  // de vulling per veld
  for (const s of segs) {
    const hh = hoogtes(k, !!s.alfa), helling = deg(s.alfa), cat = s.alfa ? 'trap' : 'basis';
    for (const [j, vd] of s.velden.entries()) {
      const ta = vd.ta, tb = vd.tb, wH = tb - ta; // vrije breedte (horizontaal)
      const pa = (z) => add(add(s.punt(ta), s.N, offN), [0, 0, z]), pb = (z) => add(add(s.punt(tb), s.N, offN), [0, 0, z]);
      const veld = { seg: s.i, j, wH, ta, tb, muurA: vd.muurA, muurB: vd.muurB, schuin: o.vl(s, ta).v > 0.5 || o.vl(s, tb).v > 0.5 };
      if (k.soort === 'spijlen') vulSpijlen(o, k, s, veld, hh, pa, pb, helling, cat, offN);
      else if (k.soort === 'staven') vulStaven(o, k, s, veld, hh, pa, pb, helling, cat, offN, st);
      else vulGlas(o, k, s, veld, hh, pa, pb, helling, offN);
    }
  }
  // openingen tussen de staander en de vulling, en onderaan
  o.openingen.push({ wat: k.soort === 'glasstaal' ? 'onder het glas' : plintAan(k, o) ? 'onder de plint' : 'onder de onderregel', mm: k.soort === 'glasstaal' ? hoogtes(k).glasOnder : plintAan(k, o) ? 50 : hoogtes(k).onder, max: NORM.opening.v });
  if (o.staanders.some((x) => x.wand)) o.openingen.push({ wat: 'tussen het knieschot en de eindstaander', mm: r1(tWand - P.b / 2), max: NORM.opening.v });
  // gaten voor de glasklemmen (blindklinkmoer M8) in de staander waar de klem zit (niet op een muurplaat)
  for (const kl of o.klemmen) {
    if (kl.muur) continue;
    let best = null, bd = Infinity;
    for (const d of o.delen) if (d.rol === 'staander') { const dd = Math.hypot(d.a[0] - kl.p[0], d.a[1] - kl.p[1]); if (dd < bd) { bd = dd; best = d; } }
    if (best) (best.gaten ??= []).push({ z: Math.round(kl.p[2] - best.a[2]), kant: kl.d });
  }
  if (k.vorm === 'trap') o.openingen.push({ wat: 'trapneus tot de onderste regel (trap)', mm: hoogtes(k, true).onder, max: NORM.openingTrap.v, trap: true });
  o.glas = k.soort === 'glasstaal' ? kiesGlas(k) : null;
  o.openingen = uniek(o.openingen);
  return o;
}

/**
 * de handregel van één segment, in stukken tussen de uiteinden en de knikken onder het dak; hart(t) = hoogte van het
 * hart boven de lijn. Op de hoeken en de trapknik verstek (de helft van de hoek), onder het dak: aan de muur schuin
 * (verticaal tegen het knieschot), op de knik verstek (de helft van de helling).
 */
function handregel(o, s, hart, offN, { prof, koop = null }) {
  const segs = o.segs, eerste = s.i === 0, laatste = s.i === segs.length - 1;
  const [vA, vB] = verstekken(segs, s);
  const eA = eerste ? o.dak.find((e) => e.nodig && e.kant === 'begin') : null, eB = laatste ? o.dak.find((e) => e.nodig && e.kant === 'eind') : null;
  const grens = [{ t: 0, zaag: eA ? deg(eA.thE) : vA, vlak: eA ? null : !eerste && (s.draai ? 'plan' : 'helling'), muur: !!eA }];
  for (const e of [eA, eB].filter(Boolean).sort((a, b) => a.tKnik - b.tKnik)) grens.push({ t: e.tKnik, zaag: deg(e.thE) / 2, vlak: 'helling', knik: e });
  grens.push({ t: s.Lh, zaag: eB ? deg(eB.thE) : vB, vlak: eB ? null : !laatste && (segs[s.i + 1].draai ? 'plan' : 'helling'), muur: !!eB });
  const P = (t) => add(add(s.punt(t), s.N, offN), [0, 0, hart(t)]);
  for (let i = 0; i < grens.length - 1; i++) {
    const a = grens[i], b = grens[i + 1];
    if (b.t - a.t < 1) continue;
    const pa = P(a.t), pb = P(b.t), schuin = Math.abs((pb[2] - s.punt(b.t)[2]) - (pa[2] - s.punt(a.t)[2])) > 0.5;
    const l = Math.hypot(pb[0] - pa[0], pb[1] - pa[1], pb[2] - pa[2]);
    const hor = [s.d[0], s.d[1], 0];
    // snijvlakken: verticaal tegen de muur; op de knik de bissectrice van de twee richtingen
    const bis = (e) => { const ss = e.kant === 'begin' ? [s.d[0] * e.cE, s.d[1] * e.cE, Math.sin(e.thE)] : [s.d[0] * e.cE, s.d[1] * e.cE, -Math.sin(e.thE)]; const m = [ss[0] + hor[0], ss[1] + hor[1], ss[2] + hor[2]]; const n = Math.hypot(...m); return m.map((x) => x / n); };
    const snij = (g) => (g.muur ? hor : g.knik ? bis(g.knik) : null);
    const d = { rol: 'handregel', prof: koop ? 'koop' : prof, ...(koop ? { koop, L: l } : {}), a: pa, b: pb, zaag: [r1(a.zaag), r1(b.zaag)], zin: schuin ? [1, -1] : [1, 1], seg: s.i, N: s.N, cat: 'basis', vlakA: a.vlak, vlakB: b.vlak, snijA: snij(a), snijB: snij(b) };
    if (schuin) { const e = a.knik ?? b.knik ?? eA ?? eB; d.dak = { hoek: r1(deg(e.thE)), horizontaal: Math.round(b.t - a.t) }; }
    o.delen.push(d);
  }
}

/** muurplaat aan een laag uiteinde: 80 x h x 8 tegen het knieschot, 2 ankers M10; de regels en de handregel erop gelast */
function muurplaat(o, e, offN) {
  const s = o.segs[e.seg], t = e.kant === 'begin' ? 0 : s.Lh, binnen = e.kant === 'begin' ? 1 : -1;
  const z0 = MUURPLAAT.onder, z1 = e.topWand, h = Math.round(z1 - z0);
  const p = add(add(s.punt(t), s.d, binnen * MUURPLAAT.t / 2), s.N, offN);
  o.platen.push({ rol: 'muurplaat', seg: s.i, p, N: s.N, d: s.d, w: MUURPLAAT.b, h, t: MUURPLAAT.t, z: [p[2] + z0, p[2] + z1], cat: 'dak', gaten: [[0, h / 4], [0, -h / 4]], gatD: 12, kant: e.kant, muur: true });
  for (const zz of [z0 + (h * 3) / 4, z0 + h / 4]) o.muurAnkers.push({ p: add(add(s.punt(t), s.N, offN), [0, 0, zz]), richting: s.d.map((x) => -x * binnen), seg: s.i, kant: e.kant });
}

/** aantal spijlen of staven in een ruimte W: tot 110 mm nooit groter dan de gekozen tussenruimte; daarboven (bewust te
 *  groot) nooit kleiner, zodat de berekening het toont */
const aantal = (W, d, g) => Math.max(1, g <= NORM.opening.v ? Math.ceil((W - g) / (d + g) - 1e-9) : Math.floor((W - g) / (d + g) + 1e-9));
/** per soort opening alleen de grootste (de vulling geeft er één per veld) */
const uniek = (lijst) => { const m = new Map(); for (const x of lijst) { const y = m.get(x.wat); if (!y || x.mm > y.mm) m.set(x.wat, x); } return [...m.values()]; };
const plintAan = (k, o) => k.plint !== false && o.klim && STIJL(k.soort, k.stijl).vulling === 'staven';

function vulSpijlen(o, k, s, veld, hh, pa, pb, helling, cat, offN) {
  const sp = o.st.spijl, P = PROFIEL[sp], d = P.b, gDoel = Math.min(o.st.gat ?? k.tussenruimte, k.tussenruimte);
  // onderregel en (bij een ronde handregel) bovenregel, tussen de staanders; schuin langs de trap. Onder het dak (een
  // schuin veld) geen bovenregel: de spijlen gaan tot onder de schuine handregel.
  const regel = (z0, z1, naam) => o.delen.push({ rol: naam, prof: 'koker40x20x2', a: pa((z0 + z1) / 2), b: pb((z0 + z1) / 2), zaag: [helling, helling], zin: [1, -1], seg: s.i, N: s.N, cat });
  regel(...hh.onderregel, 'onderregel');
  const boven = hh.bovenregel && !veld.schuin;
  if (boven) regel(...hh.bovenregel, 'bovenregel');
  const top = boven ? hh.vulTop : hh.H - hh.hrH;
  const n = aantal(veld.wH, d, gDoel), gat = (veld.wH - n * d) / (n + 1);
  for (let i = 0; i < n; i++) {
    const t = veld.ta + gat * (i + 1) + d * i + d / 2, voet = add(s.punt(t), s.N, offN), vl = o.vl(s, t), z1 = top - vl.v;
    if (z1 - hh.onderregel[1] < 20) continue;
    const dak = vl.v > 0.05;
    o.delen.push({ rol: 'spijl', prof: sp, a: add(voet, [0, 0, hh.onderregel[1]]), b: add(voet, [0, 0, z1]), zaag: [helling, dak ? r1(vl.th) : helling], zin: dak ? [1, 1] : [1, -1], seg: s.i, N: s.N, cat, ...(dak ? { snijB: snijDak(s, vl), dak: { hoek: r1(vl.th) } } : {}) });
  }
  o.openingen.push({ wat: 'tussen de spijlen', mm: r1(gat), max: NORM.opening.v, seg: s.i });
  if (boven) o.openingen.push({ wat: 'tussen de handregel en de bovenregel', mm: 70, max: NORM.opening.v });
}

function vulStaven(o, k, s, veld, hh, pa, pb, helling, cat, offN, st) {
  const plint = plintAan(k, o), top0 = hh.vulTop, kn = knikT(o, s);
  const top = (t) => top0 - o.vl(s, t).v;
  const vlak = (z0, boven, extra) => { const v = paneelVorm(s, offN, z0, boven); return { ...extra, pts: v.pts, uv: v.uv, w: v.w, h: v.h, hA: v.hA, hB: v.hB, schuin: v.uv ? r1(Math.max(...boven.map(([t]) => o.vl(s, t).th))) : 0 }; };
  if (st.vulling === 'plaat') {
    o.delen.push({ rol: 'onderregel', prof: 'koker40x20x2', a: pa(hh.onderregel[0] + 10), b: pb(hh.onderregel[0] + 10), zaag: [helling, helling], zin: [1, -1], seg: s.i, N: s.N, cat });
    const z0 = hh.onderregel[1];
    if (veld.schuin) {
      const boven = stuklijn(kn, veld.ta + 2, veld.tb - 2, top);
      o.panelen.push(vlak(z0, boven, { rol: 'plaat', patroon: st.patroon, dikte: 3, seg: s.i, N: s.N, helling, cat }));
    } else {
      const w = veld.wH - 4;
      o.panelen.push({ rol: 'plaat', patroon: st.patroon, pts: [pa(z0), pb(z0), pb(top0), pa(top0)].map((p, i) => add(p, s.d, i === 0 || i === 3 ? 2 : -2)), dikte: 3, seg: s.i, N: s.N, w, h: top0 - z0, helling, cat });
    }
    const pat = PATROON[st.patroon];
    o.klimPatroon = pat.klim;
    if (pat.klim > NORM.klimZone.max) o.openingen.push({ wat: `opstap in de plaat (${pat.naam}) tussen ${NORM.klimZone.van} en ${NORM.klimZone.tot} mm`, mm: pat.klim, max: NORM.klimZone.max, klim: true });
    return;
  }
  const P = PROFIEL[st.staaf], tbar = P.b, g = k.tussenruimte;
  let zb = 0;
  if (plint) {
    if (veld.schuin) {
      const f = (t) => Math.min(NORM.klimZone.tot, top(t)), boven = stuklijn(kn, veld.ta + 2, veld.tb - 2, f, NORM.klimZone.tot, top);
      o.panelen.push(vlak(50, boven, { rol: 'plint', patroon: 'vlak', dikte: 3, seg: s.i, N: s.N, helling, cat }));
    } else o.panelen.push({ rol: 'plint', patroon: 'vlak', pts: [pa(50), pb(50), pb(NORM.klimZone.tot), pa(NORM.klimZone.tot)].map((p, i) => add(p, s.d, i === 0 || i === 3 ? 2 : -2)), dikte: 3, seg: s.i, N: s.N, w: veld.wH - 4, h: NORM.klimZone.tot - 50, helling, cat });
    zb = NORM.klimZone.tot;
  }
  const hoogst = veld.schuin ? Math.max(...stuklijn(kn, veld.ta, veld.tb, top).map(([, z]) => z)) : top0;
  const n = aantal(hoogst - zb, tbar, g), gat = (hoogst - zb - n * tbar) / (n + 1);
  for (let i = 0; i < n; i++) {
    const z = zb + gat * (i + 1) + tbar * i + tbar / 2;
    if (!veld.schuin) { o.delen.push({ rol: 'staaf', prof: st.staaf, a: pa(z), b: pb(z), zaag: [helling, helling], zin: [1, -1], seg: s.i, N: s.N, cat }); continue; }
    // onder de schuine handregel: de staaf loopt van de hoge staander tot tegen de handregel, daar schuin gezaagd
    const lijn = stuklijn(kn, veld.ta, veld.tb, top, z, top, false);
    let t1 = null, t2 = null;
    for (const [t, zz] of lijn) if (zz >= z - 0.01) { if (t1 == null) t1 = t; t2 = t; }
    if (t1 == null || t2 - t1 < 40) continue;
    const vA = o.vl(s, t1), vB = o.vl(s, t2), aSchuin = t1 > veld.ta + 0.5, bSchuin = t2 < veld.tb - 0.5;
    const zaagHoek = (vl) => r1(90 - vl.th);
    o.delen.push({ rol: 'staaf', prof: st.staaf, a: add(add(s.punt(t1), s.N, offN), [0, 0, z]), b: add(add(s.punt(t2), s.N, offN), [0, 0, z]), zaag: [aSchuin ? zaagHoek(vA) : 0, bSchuin ? zaagHoek(vB) : 0], zin: [1, 1], seg: s.i, N: s.N, cat,
      ...(aSchuin ? { snijA: snijDak(s, vA) } : {}), ...(bSchuin ? { snijB: snijDak(s, vB) } : {}), dak: { hoek: r1(aSchuin ? vA.th : vB.th), tegen: true } });
  }
  o.openingen.push({ wat: 'tussen de horizontale staven (verticaal gemeten)', mm: r1(gat), max: NORM.opening.v, seg: s.i });
  if (!plint) o.openingen.push({ wat: `horizontale staven in de zone ${NORM.klimZone.van}-${NORM.klimZone.tot} mm (opstap)`, mm: r1(gat), max: NORM.klimZone.max, klim: true });
}

function vulGlas(o, k, s, veld, hh, pa, pb, helling, offN) {
  const g = kiesGlas(k), spel = 12, cat = s.alfa ? 'trap' : 'glas';
  let pan;
  if (veld.schuin) {
    const top = (t) => Math.max(hh.glasOnder + 20, hh.glasBoven - o.vl(s, t).v), boven = stuklijn(knikT(o, s), veld.ta + spel, veld.tb - spel, top), v = paneelVorm(s, offN, hh.glasOnder, boven);
    pan = { rol: 'glas', opbouw: g.opbouw, pts: v.pts, uv: v.uv, dikte: GLASOPBOUW[g.opbouw].dikte, seg: s.i, N: s.N, w: v.w, h: v.h, hA: v.hA, hB: v.hB, schuin: v.uv ? r1(Math.max(...boven.map(([t]) => o.vl(s, t).th))) : 0, helling, cat: 'glas', vorm: v.uv ? 'trapezium' : 'rechthoek' };
  } else {
    const pts = [pa(hh.glasOnder), pb(hh.glasOnder), pb(hh.glasBoven), pa(hh.glasBoven)].map((p, i) => add(p, s.d, i === 0 || i === 3 ? spel : -spel));
    pan = { rol: 'glas', opbouw: g.opbouw, pts, dikte: GLASOPBOUW[g.opbouw].dikte, seg: s.i, N: s.N, w: veld.wH - 2 * spel, h: hh.glasBoven - hh.glasOnder, helling, cat: 'glas', vorm: s.alfa ? 'parallellogram' : 'rechthoek' };
  }
  o.panelen.push(pan);
  const klem = o.k.soort === 'glasstaal' && STIJL(k.soort, k.stijl).staander === 'inox' ? 'klemRond' : 'klemVlak';
  // 2 klemmen per kant (120 mm van onder en boven); een lage kant onder het dak: 1 klem in het midden; lager dan 50 mm geen
  for (const [t, zin, hz, muur] of [[veld.ta, 1, pan.hA ?? pan.h, veld.muurA], [veld.tb, -1, pan.hB ?? pan.h, veld.muurB]]) {
    const zs = hz >= 360 ? [hh.glasOnder + 120, hh.glasOnder + hz - 120] : hz >= 50 ? [hh.glasOnder + hz / 2] : [];
    if (!zs.length) pan.zonderKlem = true;
    for (const z of zs) o.klemmen.push({ p: add(add(s.punt(t), s.N, offN), [0, 0, z]), d: s.d.map((x) => x * zin), N: s.N, koop: klem, seg: s.i, muur: !!muur });
  }
  o.openingen.push({ wat: 'tussen het glas en de handregel', mm: 60, max: NORM.opening.v });
  o.openingen.push({ wat: 'tussen het glas en de staander', mm: spel, max: NORM.opening.v });
}

/** volglas in een U-profiel: profiel per segment, ankers om de 125-250 mm, glasplaten tot 1200 breed (onder het dak een voeg op de knik) */
function glasU(o, q) {
  const k = o.k, segs = o.segs, g = kiesGlas(k), au = kiesAnkerU(k);
  o.glas = g; o.ankerType = au.anker; o.ankerAfstand = au.afstand; o.afstand = au.afstand;
  const hh = hoogtes(k), zij = k.bevestiging === 'zij', off = zij ? 45 : 0;
  o.offN = off;
  for (const s of segs) {
    const [vA, vB] = verstekken(segs, s);
    const zc = zij ? -55 : 55;
    o.delen.push({ rol: 'uprofiel', prof: 'koop', koop: zij ? 'qrZij' : 'qrTop', a: add(add(s.punt(0), s.N, off), [0, 0, zc]), b: add(add(s.punt(s.Lh), s.N, off), [0, 0, zc]), zaag: [r1(vA), r1(vB)], zin: [1, 1], seg: s.i, N: s.N, cat: s.alfa ? 'trap' : 'basis', L: s.L3 });
    // ankers
    const n = Math.max(2, Math.ceil((s.Lh - 100) / au.afstand) + 1);
    for (let j = 0; j < n; j++) { const t = 50 + ((s.Lh - 100) * j) / (n - 1); o.ankers.push({ p: zij ? add(s.punt(t), [0, 0, -60], 1) : s.punt(t), richting: zij ? s.N.map((x) => -x) : [0, 0, -1], seg: s.i, zij }); }
    // glasplaten: gelijk verdeeld per zone (tussen de uiteinden en de knikken onder het dak), voeg 8 mm, tot 1200 breed
    const spel = 8, knik = o.dak.filter((e) => e.nodig && e.seg === s.i).map((e) => e.tKnik).sort((a, b) => a - b);
    const grenzen = [0, ...knik, s.Lh], kn = knikT(o, s);
    for (let z = 0; z < grenzen.length - 1; z++) {
      const z0 = grenzen[z] === 0 ? spel : grenzen[z] + spel / 2, z1 = grenzen[z + 1] === s.Lh ? s.Lh - spel : grenzen[z + 1] - spel / 2, L = z1 - z0;
      const np = Math.max(1, Math.ceil((L + spel) / (1200 + spel))), w = (L - (np - 1) * spel) / np;
      for (let j = 0; j < np; j++) {
        const ta = z0 + j * (w + spel), tb = ta + w, pa = (zz) => add(add(s.punt(ta), s.N, off), [0, 0, zz]), pb = (zz) => add(add(s.punt(tb), s.N, off), [0, 0, zz]);
        const schuin = o.vl(s, ta).v > 0.5 || o.vl(s, tb).v > 0.5;
        if (schuin) {
          const top = (t) => hh.glasBoven - o.vl(s, t).v, boven = stuklijn(kn, ta, tb, top), v = paneelVorm(s, off, hh.glasOnder, boven);
          o.panelen.push({ rol: 'glas', opbouw: g.opbouw, pts: v.pts, uv: v.uv, dikte: GLASOPBOUW[g.opbouw].dikte, seg: s.i, N: s.N, w, h: v.h, hA: v.hA, hB: v.hB, schuin: v.uv ? r1(Math.max(...boven.map(([t]) => o.vl(s, t).th))) : 0, helling: 0, cat: 'glas', vorm: v.uv ? 'trapezium' : 'rechthoek' });
        } else o.panelen.push({ rol: 'glas', opbouw: g.opbouw, pts: [pa(hh.glasOnder), pb(hh.glasOnder), pb(hh.glasBoven), pa(hh.glasBoven)], dikte: GLASOPBOUW[g.opbouw].dikte, seg: s.i, N: s.N, w, h: hh.glasBoven - hh.glasOnder, helling: deg(s.alfa), cat: 'glas', vorm: s.alfa ? 'parallellogram' : 'rechthoek' });
      }
    }
    if (k.hr === 'rond') handregel(o, s, (t) => hh.H - 21 - o.vl(s, t).d, off, { koop: 'qrHandregel' });
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
