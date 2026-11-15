// Kabelmachines (FK-01 .. FK-12): een gewichtstoren (stapel tussen twee geleidestangen, afscherming voor en achter)
// of een schijvenlader, katrollen in beugels met vingerbescherming, een staalkabel met de juiste raakpunten, en de zitting,
// hefboom of greep. Maten in mm: x = breedte, y = diepte (0 = voorkant, de gebruiker), z = hoogte.
import { staander, ligger, voetjes, kussenOp, katrolBeugel, doos, gat, X, Y, Z, balk, add, mul, sub, norm } from './bouwstenen.mjs';
import { KOOP } from './onderdelen.mjs';

const pro = (b) => b.V.id === 'pro';
const R = (b) => KOOP[b.V.katrol].D / 2;
const gewicht = (b) => b.V.stapelN * b.V.stapelKg;

/**
 * gewichtstoren: voeten, twee staanders, onder- en bovenligger, voorligger op de vloer, stapel met geleidestangen,
 * afscherming voor en achter. x0 = midden, yt = hart van de stapel.
 */
export function toren(b, { x0 = 0, yt, H = 2100, naam = '', n } = {}) {
  const a = b.P('toren').b, dpl = 112, xs = 150 + 60 + a / 2, r = R(b), oud = b.huidig;
  const L = b.staaf(`Torenvoet ${naam}`.trim(), 'toren', [x0 - xs, yt - 350, a / 2], [x0 - xs, yt + 300, a / 2]);
  const Rv = b.staaf(`Torenvoet ${naam}`.trim(), 'toren', [x0 + xs, yt - 350, a / 2], [x0 + xs, yt + 300, a / 2]);
  voetjes(b, L, 2); voetjes(b, Rv, 2);
  const sL = staander(b, 'Torenstaander', 'toren', x0 - xs, yt, a, H), sR = staander(b, 'Torenstaander', 'toren', x0 + xs, yt, a, H);
  const onder = ligger(b, 'Onderligger toren', 'toren', sL, sR, { z: a + 20 + a / 2 }), boven = ligger(b, 'Bovenligger toren', 'toren', sL, sR, { z: H - a / 2 });
  const voor = ligger(b, 'Voorligger toren', 'toren', L, Rv, { y: yt - 100, z: a / 2 }), achter = ligger(b, 'Achterligger toren', 'toren', L, Rv, { y: yt + 100, z: a / 2 });
  const s = b.stapel(naam || 'stapel', [x0, yt, 0], 2 * a + 20, { hoogte: H - a, terug: oud, n });
  // afscherming voor en achter (plaat 1,5 mm, met M8 aan de staanders): tot 60 mm boven de stapel in de hoogste stand
  const zk = Math.min(H - a, s.top + s.slag + 60);
  b.groep(`Afscherming ${naam}`.trim());
  for (const k of [-1, 1]) b.plaat(`Afscherming ${k < 0 ? 'voor' : 'achter'}`, [x0 - xs + a / 2, yt + k * (dpl / 2 + 20), a], [x0 + xs - a / 2, yt + k * (dpl / 2 + 21.5), zk], { opm: 'plaat 1,5 mm, 4 x M8 aan de staanders, kanten omgezet', kleur: 'kap', laser: true });
  b.koop('boutM8', 8, [], { naam: 'Bout M8 x 30 (afscherming aan de staanders)' });
  b.groep(oud);
  return { sL, sR, L: L, Rv, onder, boven, voor, achter, s, xs, a, r, zP: H - a - 15 - r, yt, x0, H, dpl, zk };
}
/** katrol boven de stapel; de kabel komt recht omhoog uit de stapel en vertrekt naar richting 'naar' ('voor', 'achter', 'links', 'rechts') */
function bovenKatrol(b, T, x, naar = 'voor', naam = 'boven') {
  const r = T.r, c = naar === 'voor' ? [x, T.yt - r, T.zP] : naar === 'achter' ? [x, T.yt + r, T.zP] : naar === 'links' ? [x - r, T.yt, T.zP] : [x + r, T.yt, T.zP];
  return katrolBeugel(b, naam, c, naar === 'voor' || naar === 'achter' ? X : Y, { tot: { as: 2, w: T.H - T.a }, kap: c[2] < 1800 ? 'ligger' : false });
}
/** katrol onderaan voor de toren: de kabel daalt vanaf een bovenkatrol (centrum y = yt - r) en vertrekt naar voren op z - r */
function onderKatrol(b, T, x, naam = 'onder') {
  const r = T.r, c = [x, T.yt - 3 * r, T.a + 25 + r];
  return katrolBeugel(b, naam, c, X, { tot: { as: 2, w: T.a }, kapKant: [0, 0, 1] });
}
/** zitting op een paal op een vloerligger (langs y bij x0); geeft de paal en de zittingbalk */
function zitting(b, vl, y, z, lang = 360, breed = 320) {
  const Pl = b.P('bankLicht'), [, mx] = doos(vl);
  const p = staander(b, 'Zitpaal', 'bank', vl.a[0], y, mx[2], z - 73 - Pl.h);
  const zb = b.staaf('Zitbalk', 'bankLicht', [vl.a[0], y - lang / 2 + 20, z - 73 - Pl.h / 2], [vl.a[0], y + lang / 2 - 20, z - 73 - Pl.h / 2]);
  b.plaat('Kussenplaat', [vl.a[0] - 70, y - 80, z - 73], [vl.a[0] + 70, y + 80, z - 68], { gaten: [[-50, -60], [50, -60], [50, 60], [-50, 60]].map(([dx, dy]) => ({ p: [vl.a[0] + dx, y + dy, z - 73], d: 9 })) });
  kussenOp(b, 'Zitting', zb, lang, breed, { op: 5 });
  return { p, zb };
}
/** voet vooraan (langs x) en vloerligger tot tegen de voorligger van de toren */
function vloer(b, T, x0 = T.x0, y0 = 0) {
  const a = b.P('ligger').b, P = b.P('ligger');
  const vv = b.staaf('Voorvoet', 'ligger', [x0 - 300, y0 + P.b / 2, P.h / 2], [x0 + 300, y0 + P.b / 2, P.h / 2], { v: Y });
  voetjes(b, vv, 2);
  const [vmn] = doos(T.voor);
  const vl = b.staaf('Vloerligger', 'ligger', [x0, y0 + P.b, P.h / 2], [x0, vmn[1], P.h / 2]);
  void a; return { vv, vl };
}

export const KABEL = [
  {
    id: 'FK-01', soort: 'kabel', naam: 'Lat pulldown met gewichtstapel', kort: 'Lat pulldown met kniesteun en lage katrol, stapel 80/100 kg.',
    uitleg: 'Een gewichtstoren met een arm naar voren voor de latstang en een lage katrol vooraan de toren voor low row en curls. Zitting met kniesteun. Twee kabels aan de stapel: wat je niet gebruikt, hangt met de kogelstop tegen de katrol.',
    spieren: 'brede rugspier, biceps, achterkant schouder', oefeningen: ['lat pulldown', 'close grip pulldown', 'low row', 'triceps pushdown', 'curls'],
    markt: { thuis: [600, 2400], pro: [3490, 5920], bronT: 'Gorilla lat pulley 80 kg € 600, Taurus Lat Pulley Station € 999, Tunturi Platinum Dual Lat/Low Row € 2399', bronP: 'Taurus IT95 € 3490, Primal 125 kg Dual Lat/Row ± € 4070, Hammer Strength Select Lat Pulldown € 5920' },
    bouw(b) {
      const V = b.V, T = toren(b, { yt: 1200, H: 2150 }), r = T.r, a = T.a, yb = 420, P = b.P('ligger');
      const Pb = b.P('breed'), arm = b.staaf('Lat-arm', 'breed', [0, T.yt - a / 2, T.H - Pb.h / 2], [0, yb - 60, T.H - Pb.h / 2], { v: X });
      const pa = bovenKatrol(b, T, -60, 'voor', 'A (lat, boven de stapel)');
      const pb = katrolBeugel(b, 'B (lat, vooraan de arm)', [0, yb, T.H - Pb.h - 15 - r], X, { tot: { as: 2, w: T.H - Pb.h }, kap: false });
      const pc = bovenKatrol(b, T, 60, 'voor', 'C (low, boven de stapel)'), pd = onderKatrol(b, T, 60, 'D (low, onderaan)');
      const zl = 1600;
      b.koop(V.latbar, 1, [balk([-600, yb - r, zl], [600, yb - r, zl], Y, 30, 30, true, 'chroom')]);
      b.koop(V.handgreep, 1, [balk([60, T.yt - 3 * r - 400, T.a + 25], [60, T.yt - 3 * r - 260, T.a + 25], X, 30, 30, true, 'chroom')]);
      const G = gewicht(b);
      b.kabel('Kabel lat', [{ p: [-60, T.yt, T.s.top] }, pa, pb, { p: [0, yb - r, zl] }], { last: G, overbrenging: 1, slag: T.s.slag });
      b.kabel('Kabel low row', [{ p: [60, T.yt, T.s.top] }, pc, pd, { p: [60, T.yt - 3 * r - 260, T.a + 25] }], { last: G, overbrenging: 1, slag: T.s.slag });
      const { vl } = vloer(b, T);
      zitting(b, vl, yb + 20, 480);
      const kp = staander(b, 'Kniepaal', 'bank', 0, yb + 230, P.h, 640);
      kp.a = [0, yb + 230, P.h]; kp.geo = [balk(kp.a, kp.b, X, kp.P.b, kp.P.h)]; kp.L = 640 - P.h;
      b.staaf('As kniesteun', 'as', [-260, yb + 230 - kp.P.h / 2 - 15, 660], [260, yb + 230 - kp.P.h / 2 - 15, 660], { kap: false });
      b.staaf('Kniesteunbalk', 'bankLicht', [0, yb + 230, 640], [0, yb + 230 - kp.P.h / 2 - 15, 660 - 0.1], { v: X, kap: false });
      b.koop(V.schuimrol, 2, [-1, 1].map((s) => balk([s * 40, yb + 230 - kp.P.h / 2 - 15, 660], [s * 240, yb + 230 - kp.P.h / 2 - 15, 660], X, 100, 100, true, 'leer')), { naam: 'Schuimrol Ø100 (kniesteun)' });
      b.reken('Lat-arm (uitkragend, kabel over 90°: 1,41 x de kabelkracht)', arm, 'uitkrager', T.yt - yb, 0, { g: 1.41 * G, proef: 'extrinsiek', las: true });
      b.reken('Torenstaander', T.sL, 'staander', T.H - a, 0, { g: G + 2 * G, proef: 'extrinsiek' });
      b.last('Gebruiker op de zitting, stapel omhoog', 100, [0, yb, 700], { geval: 'pulldown' }); b.last('Stapel (hoogste stand)', G, [0, T.yt, T.s.top + T.s.slag - 150], { geval: 'pulldown' });
    },
  },
  {
    id: 'FK-02', soort: 'kabel', naam: 'Seated cable row met stapel', kort: 'Lange zitbank, voetsteun en lage katrol.',
    uitleg: 'Een gewichtstoren met een lage katrol, een lange lage zitbank en een schuine voetsteun. De kabel loopt boven over de stapel en vooraan naar beneden.',
    spieren: 'midden van de rug, brede rugspier, biceps', oefeningen: ['seated row', 'one-arm row', 'face pull (laag)'],
    markt: { thuis: [1640, 2300], pro: [3000, 6930], bronT: 'Pegasus Seated Row € 1637-1848, Flame Sport 1M € 2044, Tunturi Platinum Seated Row € 2299', bronP: 'Taurus Mid Row IT95 € 2999, Hammer Strength Select Seated Row € 6932' },
    bouw(b) {
      const V = b.V, T = toren(b, { yt: 1900, H: 1900 }), r = T.r, P = b.P('ligger');
      const pc = bovenKatrol(b, T, 0, 'voor', 'A (boven de stapel)'), pd = onderKatrol(b, T, 0, 'B (onderaan)');
      const pe = katrolBeugel(b, 'C (uitloop op greephoogte)', [0, T.yt - 3 * r - 300, 380 + r], X, { kapKant: [0, 0, 1] });
      const { vl } = vloer(b, T);
      const pp = staander(b, 'Uitlooppaal', 'ligger', 0, T.yt - 3 * r - 300 + 0, P.h, 380 + 2 * r + 30);
      pp.a = [0, T.yt - 3 * r - 300 + r + 30 + P.b / 2, P.h]; pp.b = [0, pp.a[1], 380 + 2 * r + 30]; pp.geo = [balk(pp.a, pp.b, X, P.b, P.h)]; pp.L = pp.b[2] - pp.a[2];
      gat(pp, [0, pp.a[1], 380 + r], 10.5, 'v');
      const zt = zitting(b, vl, 450, 430, 420, 320);
      b.plaat('Voetsteun', [-200, T.yt - 3 * r - 490, P.h], [200, T.yt - 3 * r - 482, 420], { opm: 'traanplaat 8 mm, 2 schoren' });
      const G = gewicht(b);
      b.koop(V.handgreep, 1, [balk([0, 650, 380 - 15], [0, 790, 380 - 15], X, 30, 30, true, 'chroom')]);
      b.kabel('Kabel row', [{ p: [0, T.yt, T.s.top] }, pc, pd, pe, { p: [0, 720, 380] }], { last: G, overbrenging: 1, slag: T.s.slag });
      void zt;
      b.reken('Uitlooppaal (horizontale kabelkracht)', pp, 'uitkrager', 380 + r - P.h, 0, { g: 2 * G, proef: 'extrinsiek', las: true });
      b.last('Gebruiker leunt naar achter', 100, [0, 350, 750], { geval: 'row' }); b.last('Stapel', G, [0, T.yt, T.s.top + 300], { geval: 'row' });
    },
  },
  {
    id: 'FK-03', soort: 'kabel', naam: 'Kabelcrossover (2 stapels)', kort: 'Twee torens met hoge katrollen en een optrekstang ertussen.',
    uitleg: 'Twee gewichtstorens tegenover elkaar, elk met een hoge katrol aan de binnenkant. Bovenaan verbonden met een optrekstang, onderaan met een vloerligger (gebout). Voor flyes, crossovers en pushdowns.',
    spieren: 'borst, schouders, triceps, rug', oefeningen: ['cable crossover', 'high-to-low fly', 'triceps pushdown', 'face pull'],
    markt: { thuis: [1300, 3800], pro: [4500, 9850], bronT: 'Gorilla Kabelstation € 1300, ATX Cable Pull Corner Station € 1596-1899, ATX Cable Crossover 2 x 90 kg € 3799', bronP: 'Taurus Studio € 4499-4999, Primal 2 x 125 kg ± € 4960, Life Fitness Adjustable Cable Crossover ± € 9370' },
    bouw(b) {
      const V = b.V, x0 = 1350, G = gewicht(b), T = {};
      for (const [k, s] of [['L', -1], ['R', 1]]) {
        b.groep(`Toren ${k}`);
        const t = toren(b, { x0: s * x0, yt: 500, H: 2200, naam: k });
        T[k] = t;
        const r = t.r, xin = s * x0 - s * t.xs, zc = t.zP;
        const pa = bovenKatrol(b, t, s * x0, s < 0 ? 'rechts' : 'links', `${k}1 (boven de stapel)`);
        void zc;
        const xb = xin - s * (t.a / 2 + 40 + r);
        const pb = katrolBeugel(b, `${k}2 (hoog binnen)`, [xb, t.yt, zc], Y, { tot: { as: 0, w: xin - s * t.a / 2 }, kap: false });
        gat(s < 0 ? t.sR : t.sL, [xin, t.yt, zc + r], 20, 'v');
        b.koop(V.handgreep, 1, [balk([xb - s * r, t.yt - 70, 1750], [xb - s * r, t.yt + 70, 1750], X, 30, 30, true, 'chroom')]);
        b.kabel(`Kabel ${k}`, [{ p: [s * x0, t.yt, t.s.top] }, pa, pb, { p: [xb - s * r, t.yt, 1750] }], { last: G, overbrenging: 1, slag: t.s.slag });
      }
      b.groep('frame');
      bovenVerbinding(b, T.L, T.R);
      ligger(b, 'Vloerligger', 'ligger', T.L.Rv, T.R.L, { y: T.L.yt + 200, z: b.P('ligger').h / 2 }, { bout: true, groep: 'Vloerligger', flens: b.P('ligger').h });
      b.reken('Torenstaander (kabel trekt schuin aan de hoge katrol)', T.L.sR, 'staanderM', T.L.H - T.L.a, 0, { g: G, proef: 'extrinsiek', e: 150, las: true });
      b.reken('Bovenligger (hangen of optrekken)', b.o.delen.find((d) => d.naam === 'Bovenligger met greep'), 'ligger', 2 * x0, V.gebruiker, { proef: 'intrinsiek' });
      b.last('Gebruiker in het midden', 100, [0, 200, 1000], { geval: 'fly' }); b.last('Stapel L', G, [-x0, 500, 1000], { geval: 'fly' });
    },
  },
  {
    id: 'FK-04', soort: 'kabel', naam: 'Functional trainer', kort: 'Twee verstelbare katrollen op 2:1, optrekstang.',
    uitleg: 'Twee torens met een verschuifbare wagen met katrol (19 standen, veerpen). Overbrenging 2:1: de greep voelt de helft van de stapel en gaat twee keer zo ver. Bovenaan een optrekstang.',
    spieren: 'alles: borst, rug, schouders, armen, benen, romp', oefeningen: ['crossovers', 'rows', 'woodchoppers', 'pallof press', 'curls', 'kickbacks'],
    markt: { thuis: [1500, 4500], pro: [4650, 9500], bronT: 'Primal Personal FT ± € 1510, Bodycraft EFT € 2499, Tunturi Platinum FT € 2899, Inspire FT2 Pro € 4499', bronP: 'Primal Club FT ± € 4650, Rogue FML-HR € 6120, Life Fitness Signature Dual Adjustable Pulley ± € 9048' },
    bouw(b) { ftBouw(b, [-650, 650], 'FK-04'); },
  },
  {
    id: 'FK-05', soort: 'kabel', naam: 'Kabeltoren verstelbaar', kort: 'Eén toren met een verschuifbare katrol op 2:1.',
    uitleg: 'Een gewichtstoren met een wagen die je op 19 hoogtes vastzet. Overbrenging 2:1. Klein, tegen de muur te zetten (verankeren).',
    spieren: 'alles met één arm of één kant', oefeningen: ['face pull', 'curls', 'pushdown', 'woodchopper', 'kickback', 'pallof press'],
    markt: { thuis: [800, 1500], pro: [2500, 4800], bronT: 'Taurus Lat Pulley Station hi-lo € 999, Gorilla wand-kabelstation € 150 (zonder stapel)', bronP: 'Rogue CTM-1 Functional Cable Tower € 4803 (rest AANNAME)' },
    bouw(b) { ftBouw(b, [0], 'FK-05'); },
  },
  {
    id: 'FK-06', soort: 'kabel', naam: 'Lat pulldown met schijvenlader', kort: 'Lat pulldown en low row met een slede voor schijven.',
    uitleg: 'Zoals de lat pulldown met stapel, maar met een slede (buitenkoker met UHMW-glijstukken op een binnenpaal) en een schijfhouder: goedkoper en je gebruikt je eigen schijven.',
    spieren: 'brede rugspier, biceps, midden van de rug', oefeningen: ['lat pulldown', 'low row', 'pushdown'],
    maxLast: { thuis: 80, pro: 140 },
    markt: { thuis: [700, 1150], pro: [1500, 3000], bronT: 'ATX LPL-700 Lat Machine PL € 699, ATX lat- en roeistation voor schijven € 748-1150', bronP: 'geen echte pro-referentie voor een kabel-lat met schijven: AANNAME € 1500-3000' },
    bouw(b) {
      const V = b.V, S = b.P('staander'), a = S.b, Pl = b.P('licht'), yt = 1150, H = 2150, P = b.P('ligger'), r = R(b), G = this.maxLast[V.id];
      // frame: voet, twee staanders achter, bovenligger, geleidepaal in het midden
      const vL = b.staaf('Voetbalk', 'staander', [-300, 0 + a / 2, a / 2], [-300, yt + 300, a / 2]), vR = b.staaf('Voetbalk', 'staander', [300, 0 + a / 2, a / 2], [300, yt + 300, a / 2]);
      voetjes(b, vL, 2); voetjes(b, vR, 2);
      const sL = staander(b, 'Staander', 'staander', -300, yt, a, H), sR = staander(b, 'Staander', 'staander', 300, yt, a, H);
      const bo = ligger(b, 'Bovenligger', 'staander', sL, sR, { z: H - a / 2 }), on = ligger(b, 'Onderligger', 'staander', vL, vR, { y: yt, z: a / 2 });
      ligger(b, 'Voorligger', 'staander', vL, vR, { y: a / 2, z: a / 2 });
      const gp = staander(b, 'Geleidepaal', 'licht', 0, yt, a, H - a, { opm: 'glad geslepen lasnaden; UHMW-glijstukken lopen erop; bovenaan tegen de bovenligger gelast' });
      b.groep('Slede');
      const sl = b.staaf('Slede (buitenkoker)', 'staander', [0, yt, a + 80], [0, yt, a + 380], { in: gp.id, opm: 'binnenmaat 6 mm groter dan de geleidepaal: 4 UHMW-glijstukken 3 mm' });
      const ho = b.staaf('Schijfhouder slede', 'sleeve', [0, yt - a / 2, a + 140], [0, yt - a / 2 - 260, a + 140], {});
      b.plaat('Kabeloog slede', [b.P('staander').b / 2, yt - 20, a + 330], [b.P('staander').b / 2 + 8, yt + 20, a + 400], { gaten: [{ p: [b.P('staander').b / 2 + 4, yt, a + 385], d: 13 }] });
      b.koop('uhmw', 1, [], { naam: 'UHMW-glijstukken in de slede (4 x 300 x 40 x 10)', oppervlak: 4 * 0.3 * 0.04 });
      b.groep('frame');
      b.schijven([0, yt - a / 2 - 20, a + 140], [0, -1, 0], 3);
      const Pb = b.P('breed'), arm = b.staaf('Lat-arm', 'breed', [0, yt - a / 2, H - Pb.h / 2], [0, 360, H - Pb.h / 2], { v: X });
      const zP = H - a - 15 - r, top = a + 400, xk = Pb.b / 2 + 34;
      const pa = katrolBeugel(b, 'A (boven de slede)', [xk, yt - r, zP], X, { tot: { as: 2, w: H - a }, kap: false });
      const pb = katrolBeugel(b, 'B (vooraan de arm)', [0, 420, zP], X, { tot: { as: 2, w: H - Pb.h }, kap: false });
      b.koop(V.latbar, 1, [balk([-600, 420 - r, 1600], [600, 420 - r, 1600], Y, 30, 30, true, 'chroom')]);
      b.kabel('Kabel lat', [{ p: [b.P('staander').b / 2 + 4, yt, top] }, pa, pb, { p: [0, 420 - r, 1600] }], { last: G, overbrenging: 1, slag: 700, begin: 'slede' });
      const vl = b.staaf('Vloerligger', 'ligger', [0, a, P.h / 2], [0, doos(on)[0][1], P.h / 2]);
      zitting(b, vl, 440, 480);
      void bo; void ho; void sl; void Pl;
      b.reken('Schijfhouder slede', ho, 'uitkrager', 260, 0, { g: G, proef: 'schijfhouder', las: true });
      b.reken('Lat-arm (kabel over 90°)', arm, 'uitkrager', yt - 360, 0, { g: 1.41 * G, proef: 'extrinsiek', las: true });
      b.last('Gebruiker', 100, [0, 440, 700], { geval: 'pulldown' }); b.last('Slede met schijven (hoog)', G, [0, yt - 200, 900], { geval: 'pulldown' });
    },
  },
  {
    id: 'FK-07', soort: 'kabel', naam: 'Katrolset voor het rack', kort: 'Lat- en low-row-katrollen die je in een power rack hangt.',
    uitleg: 'Een arm met twee katrollen die je met twee pennen bovenaan in een power rack (FR-01) hangt, een lage katrol op een voetplaat en een laadpen voor schijven. Het rack zelf hoort er niet bij (grijs getekend).',
    spieren: 'rug, armen', oefeningen: ['lat pulldown', 'low row', 'pushdown', 'curls'],
    maxLast: { thuis: 80, pro: 120 },
    markt: { thuis: [200, 530], pro: [600, 1200], bronT: 'Taurus Cable Pulley Power Cage € 199, ATX LTO-520 € 269, LTO-780 € 471, LTO-750 € 529', bronP: 'geen pro-prijs gevonden: AANNAME € 600-1200' },
    bouw(b) {
      const V = b.V, a = b.P('staander').b, H = pro(b) ? 2300 : 2200, wi = 1120, yf = 200, D = pro(b) ? 1220 : 1100, yb = yf + D, P = b.P('ligger'), r = R(b), G = this.maxLast[V.id];
      // het rack als context
      for (const x of [-(wi / 2 + a / 2), wi / 2 + a / 2]) for (const y of [yf, yb]) b.o.context.push(balk([x, y, 0], [x, y, H], X, a, a, false, 'context'));
      b.o.context.push(balk([-(wi / 2 + a), yb, H - a / 2], [wi / 2 + a, yb, H - a / 2], Y, a, a, false, 'context'), balk([-(wi / 2 + a), yf, H - a / 2], [wi / 2 + a, yf, H - a / 2], Y, a, a, false, 'context'));
      b.groep('Arm');
      const arm = b.staaf('Katrolarm', 'ligger', [0, yb + a / 2 + 10, H + P.h / 2], [0, yf - 350, H + P.h / 2], { v: X, opm: 'ligt op de bovenliggers van het rack' });
      for (const y of [yf, yb]) for (const s of [-1, 1]) b.plaat('Klemplaat', [s * (P.b / 2) + (s > 0 ? 0 : -8), y - a / 2 - 8, H - a], [s * (P.b / 2) + (s > 0 ? 8 : 0), y + a / 2 + 8, H], { gaten: [{ p: [s * P.b / 2, y, H - a / 2], d: 13 }], opm: 'klemt op de bovenligger; bout M12 eronder' });
      const pa = katrolBeugel(b, 'A (achter)', [0, yb - 150, H - r - 25], X, { tot: { as: 2, w: H }, kap: false, groep: 'Arm' });
      const pb = katrolBeugel(b, 'B (vooraan)', [0, yf - 300, H - r - 25], X, { tot: { as: 2, w: H }, kap: false, groep: 'Arm' });
      b.groep('Laadpen');
      const zl = 300;
      b.plaat('Bodemplaat laadpen', [-60, yb - 150 - r - 60, 0.01], [60, yb - 150 - r + 60, 12], {});
      const lp = b.staaf('Laadpen', 'sleeve', [0, yb - 150 - r, 12], [0, yb - 150 - r, zl + 12], { opm: 'oog bovenaan voor de karabijn' });
      b.groep('frame');
      b.schijven([0, yb - 150 - r, 14], Z, 2);
      b.koop(V.latbar, 1, [balk([-600, yf - 300 - r, 1650], [600, yf - 300 - r, 1650], Y, 30, 30, true, 'chroom')]);
      b.kabel('Kabel lat', [{ p: [0, yb - 150 - r, zl + 12] }, pa, pb, { p: [0, yf - 300 - r, 1650] }], { last: G, overbrenging: 1, slag: 700, begin: 'laadpen' });
      b.reken('Katrolarm (uitkragend voor het rack)', arm, 'uitkrager', 350, 0, { g: 1.41 * G, proef: 'extrinsiek', las: true });
      b.reken('Laadpen', lp, 'uitkrager', 60, 0, { g: G, proef: 'schijfhouder' });
      b.o.verankerd = 'rack';
    },
  },
  {
    id: 'FK-08', soort: 'kabel', naam: 'Leg extension met stapel', kort: 'Beenstrekker met rugleuning en een nok op het draaipunt.',
    uitleg: 'Zitting met rugleuning, een hefboom met scheenrol die op kniehoogte draait. Een nok (trommel R100) op de as wikkelt de kabel op en tilt de stapel. Handgrepen naast de zitting.',
    spieren: 'quadriceps', oefeningen: ['leg extension', 'enkelbeens leg extension'],
    markt: { thuis: [900, 2350], pro: [3490, 7940], bronT: 'ATX leg extension/curl € 899-999, Tunturi Platinum Leg Extension € 2199, Flame Sport 8MX € 2345', bronP: 'Taurus IT95 € 3490, Primal Dual Leg Ext/Curl ± € 4070, Hammer Strength Select Leg Extension € 7943' },
    bouw(b) { beenMachine(b, 'extensie'); },
  },
  {
    id: 'FK-09', soort: 'kabel', naam: 'Leg curl zittend met stapel', kort: 'Beenbuiger met dijklem en enkelrol.',
    uitleg: 'Zitting met rugleuning en een dijklem; de hefboom met de enkelrol draait op kniehoogte. De nok op de as wikkelt de kabel op en tilt de stapel.',
    spieren: 'hamstrings, kuiten', oefeningen: ['seated leg curl', 'enkelbeens leg curl'],
    markt: { thuis: [900, 2400], pro: [3490, 7940], bronT: 'Taurus Prone Leg Curl IFP € 899, ATX BCO-680 € 899-1168, Tunturi Platinum Dual € 2299-2399', bronP: 'Taurus Seated Leg Curl IT95 € 3490, Hammer Strength SE Seated Leg Curl € 7943' },
    bouw(b) { beenMachine(b, 'curl'); },
  },
  {
    id: 'FK-10', soort: 'kabel', naam: 'Pec deck / rear delt', kort: 'Butterfly en achterste schouder met twee draaiende armen.',
    uitleg: 'Een gewichtstoren met een arm naar voren; daaronder twee verticale assen met een nok en een draaiende arm met een kussen. Elke arm heeft zijn eigen kabel naar de stapel: ze bewegen apart.',
    spieren: 'borst, voorste schouder (fly), achterste schouder (rear delt)', oefeningen: ['pec deck fly', 'rear delt fly'],
    markt: { thuis: [800, 2400], pro: [3490, 6930], bronT: 'Taurus Standing Chest Fly IFP € 799, Tunturi Platinum Dual Pec Fly/Rear Delt € 2399', bronP: 'Taurus Pec/Rear IT95 € 3490, Primal ± € 4300, Hammer Strength Select € 6932' },
    bouw(b) {
      const V = b.V, T = toren(b, { yt: 1150, H: 2100 }), r = T.r, a = T.a, P = b.P('ligger'), G = gewicht(b), yp = 520, zc = T.zP + r;
      const Pb = b.P('breed'), arm = b.staaf('Bovenarm', 'breed', [0, T.yt - a / 2, T.H - Pb.h / 2], [0, yp - 200, T.H - Pb.h / 2], { v: X });
      const dw = b.staaf('Dwarsligger assen', 'ligger', [-260, yp, T.H - Pb.h - P.h / 2], [260, yp, T.H - Pb.h - P.h / 2], { v: Y });
      void dw;
      const katr = {};
      for (const [k, s] of [['L', -1], ['R', 1]]) katr[k] = bovenKatrol(b, T, s * 60, 'voor', `${k} (boven de stapel)`);
      for (const [k, s] of [['L', -1], ['R', 1]]) {
        b.groep(`Arm ${k}`);
        const xa = s * 200, zt = T.H - Pb.h - P.h;
        b.staaf('Draaias', 'b48x4', [xa, yp, zt], [xa, yp, 1350], { kap: false, opm: 'draait in 2 kogellagers 6205 in een lagerhuis onder de dwarsligger' });
        b.plaat('Nok (R100)', [xa - 100, yp - 100, zt - 46], [xa + 100, yp + 100, zt - 34], { rond: true, in: 'as', opm: 'schijf Ø200 x 12 met kabelgroef (draaibank) of 2 platen met een tussenring; op de as gelast' });
        const ar = b.staaf('Arm', 'arm', [xa, yp, 1350 - b.P('arm').h / 2], [s * 560, yp, 1350 - b.P('arm').h / 2], { v: Y });
        const pd = b.staaf('Kussenpaal', 'arm', [s * 560, yp, 1350 - b.P('arm').h], [s * 560, yp, 900]);
        b.kussen(`Armkussen ${k}`, [s * 560, yp - b.P('arm').b / 2, 950], [s * 560, yp - b.P('arm').b / 2, 1300], [0, -1, 0], 220, 60);
        b.staaf('Handgreep', 'greep', [s * 560, yp - b.P('arm').b / 2, 1320], [s * 560, yp - 180, 1320], {});
        b.groep('frame');
        b.kabel(`Kabel arm ${k}`, [{ p: [s * 60, T.yt, T.s.top] }, katr[k], { p: [xa, yp + 100, zt - 40] }], { last: G, overbrenging: 1, slag: T.s.slag, einde: 'nok' });
        b.koop(V.id === 'pro' ? 'lager6204pro' : 'lager6204', 2, [], { naam: `Kogellager (as arm ${k})` });
        if (k === 'L') b.reken('Arm (kussen op het einde)', ar, 'uitkrager', 360, 0, { g: G * 100 / 360, proef: 'extrinsiek', las: true });
        void pd;
      }
      const { vl } = vloer(b, T);
      zitting(b, vl, yp - 40, 470);
      const rp = staander(b, 'Rugpaal', 'bank', 0, yp + 220, P.h, 1150);
      b.kussen('Rugleuning', [0, yp + 220 - b.P('bank').h / 2, 600], [0, yp + 220 - b.P('bank').h / 2, 1150], [0, -1, 0], 300, 68);
      void rp;
      b.reken('Bovenarm (uitkragend, beide kabels)', arm, 'uitkrager', T.yt - yp, 0, { g: 1.41 * G, proef: 'extrinsiek', las: true });
      b.last('Gebruiker', 100, [0, yp - 40, 800], { geval: 'fly' }); b.last('Stapel hoog', G, [0, T.yt, 1000], { geval: 'fly' });
    },
  },
  {
    id: 'FK-11', soort: 'kabel', naam: 'Wandkatrol met schijvenlader', kort: 'Rail tegen de muur met hoge en lage katrol en laadpen.',
    uitleg: 'Een verticale rail met drie muurplaten, een arm met een katrol bovenaan, een katrol onderaan en een laadpen voor schijven die op de vloer staat. Altijd in de muur verankeren.',
    spieren: 'rug, armen, schouders', oefeningen: ['lat pulldown (knielend)', 'pushdown', 'face pull', 'curls'],
    maxLast: { thuis: 60, pro: 100 },
    markt: { thuis: [150, 450], pro: [500, 1200], bronT: 'Gorilla Lat Pulley wand-kabelstation € 150 (ATX: geen prijs gevonden)', bronP: 'geen prijs gevonden: AANNAME € 500-1200' },
    bouw(b) {
      const V = b.V, a = b.P('licht').b, t = V.plaat, Dm = 500, r = R(b), G = this.maxLast[V.id], H = 2200;
      b.muur(Dm);
      const rail = staander(b, 'Rail', 'licht', 0, Dm - t - a / 2, 150, H);
      for (const z of [250, 1200, H - 100]) {
        const wp = b.plaat('Muurplaat', [-70, Dm - t, z - 60], [70, Dm, z + 60], { gaten: [[-50, -35], [50, -35], [-50, 35], [50, 35]].map(([x, dz]) => ({ p: [x, Dm, z + dz], d: 14 })) });
        b.bout('Muuranker', 'muur', 'frame', [0, Dm, z], Y, { key: 'anker', punten: wp.gaten.map((g) => g.p), lengte: 110, uit: [0, -200, 0] });
      }
      const ha = b.P('ligger').h, arm = b.staaf('Arm', 'ligger', [0, Dm - t - a, H - ha / 2], [0, Dm - 520, H - ha / 2], { v: X });
      const pa = katrolBeugel(b, 'A (bovenaan de rail)', [0, Dm - t - a - 25 - r, H - ha - 15 - r], X, { tot: { as: 2, w: H - ha }, kap: false });
      const pb = katrolBeugel(b, 'B (vooraan de arm)', [0, Dm - 480, H - ha - 15 - r], X, { tot: { as: 2, w: H - ha }, kap: false });
      b.groep('Laadpen');
      const yl = Dm - t - a - 25 - 2 * r;
      b.plaat('Bodemplaat laadpen', [-60, yl - 60, 0.01], [60, yl + 60, 12], {});
      const lp = b.staaf('Laadpen', 'sleeve', [0, yl, 12], [0, yl, 312], {});
      b.groep('frame');
      b.schijven([0, yl, 14], Z, 2);
      b.koop(V.handgreep, 1, [balk([0, Dm - 480 - r - 70, 1500], [0, Dm - 480 - r + 70, 1500], X, 30, 30, true, 'chroom')]);
      b.kabel('Kabel', [{ p: [0, yl, 312] }, pa, pb, { p: [0, Dm - 480 - r, 1500] }], { last: G, overbrenging: 1, slag: 900, begin: 'laadpen' });
      b.reken('Arm (uitkragend, kabel over 90°)', arm, 'uitkrager', 480, 0, { g: 1.41 * G, proef: 'extrinsiek', las: true });
      b.reken('Laadpen', lp, 'uitkrager', 60, 0, { g: G, proef: 'schijfhouder' });
      b.o.verankerd = 'muur'; b.o.anker = { arm: 480, z: 950, n: 2, kg: 1.41 * G };
      void rail;
    },
  },
  {
    id: 'FK-12', soort: 'kabel', naam: 'Glute kickback met stapel', kort: 'Staand op een platform, borstkussen, hefboom met voetplaat.',
    uitleg: 'Je staat op een platform met je borst tegen een kussen en duwt met één been een voetplaat naar achter. De hefboom draait op heuphoogte; een nok wikkelt de kabel op naar de stapel.',
    spieren: 'bilspieren, hamstrings', oefeningen: ['glute kickback', 'standing hip extension'],
    markt: { thuis: [1000, 2300], pro: [3170, 4600], bronT: 'AANNAME: geen thuismodel met stapel gevonden; Tunturi Platinum Hip Thrust met stapel € 2299 als dichtstbijzijnd', bronP: 'Flame Sport Glute Kickback 2V € 3170, Spirit ± € 3470, BLK BOX ± € 4600' },
    bouw(b) { beenMachine(b, 'kickback'); },
  },
];

/** verbinding bovenop twee torens: een ligger op de bovenliggers, met 2 bouten M12/M16 per kant (ook optrekgreep) */
function bovenVerbinding(b, TL, TR) {
  const P = b.P('ligger'), H = TL.H, oud = b.huidig;
  b.groep('Bovenligger met greep');
  const st = b.staaf('Bovenligger met greep', 'ligger', [TL.x0 - 120, TL.yt, H + P.h / 2], [TR.x0 + 120, TL.yt, H + P.h / 2], { opm: 'ligt op de bovenliggers van de torens; middendeel = optrekgreep (rond geslepen hoeken)' });
  b.groep(oud);
  const bd = b.V.bout === 'boutM16' ? 17 : 13;
  for (const T of [TL, TR]) {
    const pts = [-1, 1].map((s) => [T.x0 + s * 70, T.yt, H]);
    for (const p of pts) { gat(st, p, bd, Math.abs(st.w[2]) > 0.5 ? 'w' : 'v'); gat(T.boven, p, bd, Math.abs(T.boven.w[2]) > 0.5 ? 'w' : 'v'); }
    b.bout('Bovenligger op de toren', T.boven.groep, 'Bovenligger met greep', [T.x0, T.yt, H], Z, { punten: pts, lengte: 2 * P.h + 30, uit: [0, 0, 160], F: b.V.gebruiker / 4 });
  }
  return st;
}
/** functional trainer of kabeltoren: één of twee torens met een rail aan de binnenkant, een wagen met katrol, 2:1 */
function ftBouw(b, xs, id) {
  const V = b.V, G = gewicht(b), T = [];
  for (const [i, x0] of xs.entries()) {
    const k = xs.length > 1 ? (i ? 'R' : 'L') : '';
    b.groep(`Toren ${k}`.trim());
    const t = toren(b, { x0, yt: 600, H: 2150, naam: k }), r = t.r, a = t.a, sIn = x0 === 0 ? 1 : -Math.sign(x0);
    T.push(t);
    const S = sIn > 0 ? t.sR : t.sL, xr = x0 + sIn * (t.xs + a), xd = xr + sIn * (a / 2 + 80), zPB = t.zP, railTop = zPB - r - 25;
    // rail tegen de binnenkant van de torenstaander, met 19 gaten om de 75 mm
    const rail = staander(b, 'Wagenrail', 'staander', xr, t.yt, a, railTop, { gaten: Array.from({ length: 19 }, (_, j) => ({ s: 250 + j * 75 - a, d: V.gat, as: 'w' })) });
    gat(S, [x0 + sIn * t.xs, t.yt, zPB + r], 20, 'v');
    const pa = bovenKatrol(b, t, x0, sIn > 0 ? 'rechts' : 'links', `${k} A (boven de stapel)`.trim());
    const pb = katrolBeugel(b, `${k} B (bovenaan de rail)`.trim(), [xd - sIn * r, t.yt, zPB], Y, { tot: { as: 2, w: railTop }, kap: false });
    // wagen
    b.groep(`Wagen ${k}`.trim());
    const zw = 1200, Pw = b.P('wagen');
    b.staaf('Wagen (buitenkoker)', 'wagen', [xr, t.yt, zw - 130], [xr, t.yt, zw + 130], { in: rail.id, opm: 'binnenmaat 6 mm groter dan de rail; 4 UHMW-glijstukken 3 mm' });
    const kw = katrolBeugel(b, `${k} wagen`.trim(), [xd + sIn * r, t.yt, zw], Y, { kapKant: [0, 0, 1], rug: { as: 0, w: xr + sIn * Pw.b / 2 }, groep: `Wagen ${k}`.trim() });
    b.koop('uhmw', 1, [], { naam: 'UHMW-glijstukken in de wagen (4 x 260 x 40 x 10)', oppervlak: 4 * 0.26 * 0.04 });
    b.groep(`Toren ${k}`.trim());
    b.pen(`Veerpen wagen ${k}`.trim(), [xr, t.yt, zw], Y, { d: V.pin, key: b.V.pin25, snedes: 2, a: `Toren ${k}`.trim(), b: `Wagen ${k}`.trim(), uit: [sIn * 160, 0, 0], F: G, factor: 'extrinsiekPen', lengte: Pw.b + 40 });
    const xg = xd + sIn * (2 * r + 160);
    b.koop(V.handgreep, 1, [balk([xg, t.yt - 70, zw - r], [xg, t.yt + 70, zw - r], X, 30, 30, true, 'chroom')]);
    b.kabel(`Kabel ${k}`.trim(), [{ p: [x0, t.yt, t.H - a] }, { p: [x0, t.yt, t.s.top + 40], los: true }, pa, pb, kw, { p: [xg, t.yt, zw - r] }], { last: G, overbrenging: 2, slag: t.s.slag, begin: 'anker' });
    b.koop(V.katrol, 1, [balk([x0, t.yt - 13, t.s.top + 40 + r], [x0, t.yt + 13, t.s.top + 40 + r], X, 2 * r, 2 * r, true, 'katrol')], { naam: `${KOOP[V.katrol].naam}: losse katrol op de stapel (2:1)` });
    b.groep('frame');
  }
  if (xs.length > 1) {
    bovenVerbinding(b, T[0], T[1]);
    ligger(b, 'Vloerligger', 'ligger', T[0].Rv, T[1].L, { y: T[0].yt + 200, z: b.P('ligger').h / 2 }, { bout: true, groep: 'Vloerligger', flens: b.P('ligger').h });
    b.reken('Bovenligger (hangen of optrekken)', b.o.delen.find((d) => d.naam === 'Bovenligger met greep'), 'ligger', Math.abs(xs[1] - xs[0]), V.gebruiker, { proef: 'intrinsiek' });
  } else b.o.verankerd = 'muur';
  const t = T[0];
  b.reken('Wagenrail (kabel trekt zijwaarts aan de wagen)', b.o.delen.find((d) => d.naam === 'Wagenrail'), 'staanderM', 1200 - t.a, 0, { g: G / 2, proef: 'extrinsiek', e: 2 * t.r + 100, las: true, knik: 1 });
  b.last('Gebruiker voor de toren', 100, [xs[0], 0, 1000], { geval: 'trek' }); b.last('Stapel', G, [xs[0], t.yt, 1000], { geval: 'trek' });
  void id;
}

/** leg extension / leg curl / kickback: toren achteraan, hefboom met nok, kabel via onderkatrol naar de nok */
function beenMachine(b, soort) {
  const V = b.V, G = gewicht(b), P = b.P('ligger'), Pb = b.P('bank'), T = toren(b, { yt: soort === 'kickback' ? 1300 : 1250, H: 1800 }), r = T.r;
  const pa = bovenKatrol(b, T, 0, 'voor', 'A (boven de stapel)'), pd = onderKatrol(b, T, 0, 'B (onderaan)');
  const { vl } = vloer(b, T);
  const yk = soort === 'kickback' ? 650 : 330, zk = soort === 'kickback' ? 950 : 560; // draaipunt (knie of heup)
  // draaipunt in twee lageroren op een paal naast de zitting
  const xo = soort === 'kickback' ? 340 : 300;
  const paal = staander(b, 'Lagerpaal', 'ligger', xo, yk, P.h, soort === 'curl' ? 760 : zk + 60);
  ligger(b, 'Dwarsvoet lagerpaal', 'ligger', vl, paal, { y: yk, z: P.h / 2 }, { as: 0 });
  const pv = b.staaf('Voet lagerpaal', 'ligger', [xo, yk - 250, P.h / 2], [xo, yk + 250, P.h / 2]); voetjes(b, pv, 2);
  b.groep('Hefboom');
  const as = b.staaf('As hefboom', 'as', [xo - P.b / 2 - 1, yk, zk], [-xo + 40, yk, zk], { kap: false, in: paal.id });
  const nokX = -xo + 80;
  b.plaat('Nok (R100)', [nokX - 6, yk - 100, zk - 100], [nokX + 6, yk + 100, zk + 100], { rond: true, opm: 'schijf Ø200 x 12 met kabelgroef' });
  let lev, rol;
  if (soort === 'extensie') { lev = b.staaf('Hefboomarm', 'arm', [0, yk, zk], [0, yk - 60, zk - 420], { v: X }); rol = [0, yk - 70, zk - 430]; }
  else if (soort === 'curl') { lev = b.staaf('Hefboomarm', 'arm', [0, yk, zk], [0, yk - 420, zk + 40], { v: X }); rol = [0, yk - 430, zk + 40]; }
  else { lev = b.staaf('Hefboomarm', 'arm', [0, yk, zk], [0, yk + 120, 250], { v: X }); rol = [0, yk + 130, 240]; }
  if (soort !== 'kickback') {
    b.staaf('As rol', 'as', [-200, rol[1], rol[2]], [200, rol[1], rol[2]], { kap: false });
    b.koop(V.schuimrol, 2, [-1, 1].map((s) => balk([s * 30, rol[1], rol[2]], [s * 230, rol[1], rol[2]], X, 100, 100, true, 'leer')), { naam: 'Schuimrol Ø100 (scheen of enkel)' });
  } else b.plaat('Voetplaat kickback', [-110, rol[1], rol[2] - 120], [110, rol[1] + 10, rol[2] + 80], { opm: 'met rubber' });
  b.groep('frame');
  b.koop(V.id === 'pro' ? 'lager6204pro' : 'lager6204', 2, [], { naam: 'Kogellager in de lagerpaal' });
  b.pen('As hefboom in de lagerpaal', [xo, yk, zk], X, { d: b.P('as').b, snedes: 1, a: 'frame', b: 'Hefboom', uit: [-200, 0, 0], F: G * 1.2, factor: 'extrinsiekPen' });
  b.kabel('Kabel', [{ p: [0, T.yt, T.s.top] }, pa, pd, { p: [nokX, yk + 100, zk - 100] }], { last: G, overbrenging: 1, slag: T.s.slag, einde: 'nok' });
  if (soort === 'kickback') {
    b.plaat('Platform', [-300, 350, P.h], [300, 900, P.h + 8], { opm: 'traanplaat 8 mm' });
    const kp = staander(b, 'Kussenpaal', 'bank', 0, 300, P.h, 1250);
    b.kussen('Borstkussen', [0, 300 + Pb.h / 2, 1000], [0, 300 + Pb.h / 2, 1300], [0, 1, 0], 300, 68);
    for (const s of [-1, 1]) b.staaf('Handgreep', 'greep', [s * Pb.b / 2, 300, 1180], [s * 300, 300, 1180], {});
    void kp;
  } else {
    zitting(b, vl, yk + 230, 480, 380, 320);
    const rp = staander(b, 'Rugpaal', 'bank', 0, yk + 470, P.h, 1100);
    b.kussen('Rugleuning', [0, yk + 470 - Pb.h / 2, 560], [0, yk + 470 - Pb.h / 2, 1100], [0, -1, 0], 320, 68);
    for (const s of [-1, 1]) b.staaf('Handgreep', 'greep', [s * Pb.b / 2, yk + 470, 500], [s * 280, yk + 470, 500], {});
    if (soort === 'curl') { const Pl = b.P('licht'); b.staaf('Dijklem', 'licht', [xo - P.b / 2, yk, 730], [-170, yk, 730], { v: Y }); b.kussen('Dijkussen', [-160, yk, 730 - Pl.h / 2], [160, yk, 730 - Pl.h / 2], [0, 0, -1], 120, 60); }
    void rp;
  }
  b.reken('Hefboomarm (kracht aan de rol of de voetplaat)', lev, 'uitkrager', 420, 0, { g: G * 100 / 420, proef: 'extrinsiek', las: true, dwars: true });
  b.reken('Lagerpaal', paal, 'staanderM', zk - P.h, 0, { g: G, proef: 'extrinsiek', e: 300, las: true });
  b.last('Gebruiker', 100, [0, yk + 230, 800], { geval: 'been' }); b.last('Stapel hoog', G, [0, T.yt, 1000], { geval: 'been' });
  void as;
}
