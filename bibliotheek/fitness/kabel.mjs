// Kabelmachines (FK-01 .. FK-12): een gewichtstoren (stapel tussen twee geleidestangen, afscherming voor en achter)
// of een schijvenlader, katrollen in beugels met vingerbescherming, een staalkabel met de juiste raakpunten, en de zitting,
// hefboom of greep. Maten in mm: x = breedte, y = diepte (0 = voorkant, de gebruiker), z = hoogte.
import { staander, ligger, dwarsOp, voetjes, kussenOp, katrolBeugel, doos, gat, X, Y, Z, balk, add, mul, sub, norm } from './bouwstenen.mjs';
import { KOOP } from './onderdelen.mjs';
import { nokKappen, vloerGoot } from './selectorized.mjs';
import { uitslagStrook, buigToeslag, terugzet } from './vorm.mjs';

const pro = (b) => b.V.id !== 'thuis'; // pro en semi-pro: dezelfde maten
const rad = (g) => (g * Math.PI) / 180;
const R = (b) => KOOP[b.V.katrol].D / 2;
const gewicht = (b) => b.V.stapelN * b.V.stapelKg;

/**
 * gewichtstoren: voeten, twee staanders, onder- en bovenligger, voorligger op de vloer, stapel met geleidestangen,
 * afscherming voor en achter. x0 = midden, yt = hart van de stapel.
 */
export function toren(b, { x0 = 0, yt, H = 2100, naam = '', n, ogen = [0], voorVoet = 350, dpl = 112, slag, onderHoog = 0, doorvoer = null, openAchter = null } = {}) {
  const a = b.P('toren').b, xs = 150 + 60 + a / 2, r = R(b), oud = b.huidig;
  const L = b.staaf(`Torenvoet ${naam}`.trim(), 'toren', [x0 - xs, yt - voorVoet, a / 2], [x0 - xs, yt + 300, a / 2]);
  const Rv = b.staaf(`Torenvoet ${naam}`.trim(), 'toren', [x0 + xs, yt - voorVoet, a / 2], [x0 + xs, yt + 300, a / 2]);
  voetjes(b, L, 2); voetjes(b, Rv, 2);
  const sL = staander(b, 'Torenstaander', 'toren', x0 - xs, yt, a, H), sR = staander(b, 'Torenstaander', 'toren', x0 + xs, yt, a, H);
  const onder = ligger(b, 'Onderligger toren', 'toren', sL, sR, { z: a + 20 + onderHoog + a / 2 }), boven = ligger(b, 'Bovenligger toren', 'toren', sL, sR, { z: H - a / 2 });
  const voor = ligger(b, 'Voorligger toren', 'toren', L, Rv, { y: yt - 100, z: a / 2 }), achter = ligger(b, 'Achterligger toren', 'toren', L, Rv, { y: yt + 100, z: a / 2 });
  const s = b.stapel(naam || 'stapel', [x0, yt, 0], 2 * a + 20 + onderHoog, { hoogte: H - a, terug: oud, n, ogen, dpl, slag });
  // afscherming voor en achter (plaat 1,5 mm, met M8 aan de staanders): tot 60 mm boven de stapel in de hoogste stand
  const zk = Math.min(H - a, s.top + s.slag + 60);
  b.groep(`Afscherming ${naam}`.trim());
  omkap(b, { x0, yt, xs, a, H, dpl, zk, L, Rv, doorvoer, openAchter });
  b.koop('boutM8', 16, [], { naam: 'Bout M8 x 30 met kunststof ring (kappen aan de staanders, verzonken)' });
  b.groep(oud);
  return { sL, sR, L: L, Rv, onder, boven, voor, achter, s, xs, a, r, zP: H - a - 15 - r, yt, x0, H, dpl, zk };
}
/**
 * de stapeltoren volledig omkapt (pro-vormtaal, zoals de selectorized toestellen van de grote merken): voor-, zij- en
 * achterkap uit plaat 1,5 mm, gezet met hoeken R25, een afgeronde bovenkap (gezet 2 mm) en ABS-voetkappen over de
 * torenvoeten. In de voorkap een kijkvenster (polycarbonaat) met een sleuf voor de selectiepen en de instructieplaat.
 * Het frame zit erachter; de kappen raken de staanders (M8 met kunststof ring).
 */
function omkap(b, { x0, yt, xs, a, H, dpl, zk, L, Rv, doorvoer = null, openAchter = null }) {
  const o = b.o, t = 1.5, kr = 25, Wx = xs + a / 2 + 1, yf = yt - dpl / 2 - 22, yb = yt + dpl / 2 + 22, zb = a + 2, zT = H + 25, sl = 25, vw = 55, vz0 = zb + 80, vz1 = Math.min(zk, zT - 320);
  o.pronk = o.pronk ?? [];
  const venster = [[x0 - sl - vw, vz0, 12], [x0 + sl + vw, vz0, 12], [x0 + sl + vw, vz1, 12], [x0 - sl - vw, vz1, 12]];
  b.contour('Afscherming voor', [0, yf + t / 2, 0], [1, 0, 0], [0, 0, 1], t, [[x0 - Wx + kr, zb], [x0 + Wx - kr, zb], [x0 + Wx - kr, zT], [x0 - Wx + kr, zT]], { kleur: 'kap', uitsparingen: [venster, ...(doorvoer ? [doorvoer] : [])], opm: `voorkap 1,5 mm DC01, gelaserd met een venster ${2 * (sl + vw)} x ${Math.round(vz1 - vz0)} (polycarbonaat erachter, sleuf ${2 * sl} mm voor de selectiepen); poedercoat RAL 9006` });
  b.contour('Afscherming achter', [0, yb - t / 2, 0], [1, 0, 0], [0, 0, 1], t, [[x0 - Wx + kr, zb], [x0 + Wx - kr, zb], [x0 + Wx - kr, zT], [x0 - Wx + kr, zT]], { kleur: 'kap', uitsparingen: [...(doorvoer ? [doorvoer] : []), ...(openAchter ? [openAchter] : [])], opm: `achterkap 1,5 mm DC01; poedercoat RAL 9006${openAchter ? '; opening voor de takel (de takelkoker sluit erop aan)' : ''}${doorvoer ? '; doorvoer voor de vloerkabel (onder de kabelgoot)' : ''}` });
  for (const sx of [-1, 1]) { const zk = b.contour('Afscherming zijkant', [x0 + sx * (Wx - t / 2), 0, 0], [0, 1, 0], [0, 0, 1], t, [[yf + kr, zb], [yb - kr, zb], [yb - kr, zT], [yf + kr, zT]], { kleur: 'kap', opm: 'zijkap 1,5 mm DC01, gezet: aan voor- en achterkant een plooi R25 naar binnen (sluit de hoeken); de stapel is rondom gesloten (klasse S)' }); b.gezet('Afscherming zijkant', [zk], { t, uitslag: uitslagStrook(zT - zb, [15, yb - yf - 2 * kr, 15], [{ hoek: 90, R: kr, richting: 'op' }, { hoek: 90, R: kr, richting: 'op' }], t), opm: 'zijkap 1,5 mm DC01, gezet: aan voor- en achterkant een plooi 90° Ri 25 naar binnen met een flens van 15 mm (sluit de hoeken)' }); }
  const top = b.contour('Afscherming boven', [0, 0, zT + 1], [1, 0, 0], [0, 1, 0], 2, [[x0 - Wx, yf, 40], [x0 + Wx, yf, 40], [x0 + Wx, yb, 40], [x0 - Wx, yb, 40]], { kleur: 'kap', opm: 'bovenkap 2 mm: deksel met 4 randen van 30 mm (Ri 4), hoeken uitgesneden en dichtgelast; kabeldoorvoer met borstel' });
  {
    // uitslag van de bovenkap: rechthoek met 4 flenzen (hoeken uitgesneden), 4 zettingen 90°
    // N-P1-07 v7: de buitenmaten W x Dd en de randen 30 mm zijn buitenmaten: vlak = buitenmaat − (Ri + t) per zetting
    const os = terugzet(90, 4, 2), W = 2 * Wx - 2 * os, Dd = yb - yf - 2 * os, fl = 30 - os, ba = buigToeslag(90, 4, 2), F = fl + ba;
    const pts = [[0, -F], [W, -F], [W, 0], [W + F, 0], [W + F, Dd], [W, Dd], [W, Dd + F], [0, Dd + F], [0, Dd], [-F, Dd], [-F, 0], [0, 0]];
    const zl = [[[0, -ba / 2], [W, -ba / 2]], [[W + ba / 2, 0], [W + ba / 2, Dd]], [[W, Dd + ba / 2], [0, Dd + ba / 2]], [[-ba / 2, Dd], [-ba / 2, 0]]].map(([a2, b2]) => ({ a: a2, b: b2, hoek: 90, R: 4, richting: 'neer', ba }));
    b.gezet('Afscherming boven', [top], { t: 2, uitslag: { punten: pts, zetlijnen: zl }, opm: 'bovenkap 2 mm DC01: 4 randen 30 mm gezet (Ri 4), hoeken uitgesneden en dichtgelast' });
  }
  top.contour.toon = { t: 34, bevel: 12, dz: 16 };
  // ronde hoeken van de kap (de plooien R25) en het venster met de sleuf
  for (const [xx, yy] of [[x0 - Wx + kr, yf + kr], [x0 + Wx - kr, yf + kr], [x0 - Wx + kr, yb - kr], [x0 + Wx - kr, yb - kr]]) o.pronk.push(balk([xx, yy, zb], [xx, yy, zT], [1, 0, 0], 2 * kr, 2 * kr, true, 'kappaneel'));
  for (const sx of [-1, 1]) o.pronk.push(balk([x0 + sx * (sl + vw / 2), yf + 3, vz0 + 4], [x0 + sx * (sl + vw / 2), yf + 3, vz1 - 4], [1, 0, 0], vw, 4, false, 'venster'));
  b.koop('polycarbonaat', 1, [], { naam: 'Kijkvenster polycarbonaat 4 mm achter de voorkap (2 delen naast de sleuf)', groep: 'afwerking' });
  // instructieplaat op de voorkap, links van het venster
  const pw = Math.min(150, Wx - sl - vw - kr - 20), ph = Math.round(pw * 1.4);
  if (pw >= 60) { const zc = Math.min(1450, zT - ph / 2 - 60), xc = x0 - Wx + kr + 6 + pw / 2, op = [0, 0, 1], zij = [1, 0, 0]; o.pronk.push(balk([xc, yf - 0.6, zc - ph / 2], [xc, yf - 0.6, zc + ph / 2], zij, pw, 1, false, 'instructie')); o.instructieOpKap = true; void op; }
  if (o.instructieOpKap) b.koop('instructiesticker', 1, [], { naam: 'Instructieplaat op de voorkap (oefeningen, spieren, pen-instructie)', groep: 'afwerking' });
  // ABS-voetkappen over de torenvoeten
  for (const V of [L, Rv]) { const g = balk(V.a, V.b, V.v, V.P.b + 14, V.P.h + 10, false, 'eindkap'); g.r = 18; g.a = [g.a[0], g.a[1], g.a[2] + 3]; g.b = [g.b[0], g.b[1], g.b[2] + 3]; o.pronk.push(g); }
  b.koop('voetkap', 2, [], { naam: 'ABS-voetkap over de torenvoet (afgerond, met rubber onderrand)', groep: 'afwerking' });
  // v7 (N-P1-02): de omkapte toren als gesloten volume voor kapFouten; de spleet onder de kappen is een opening van zb mm
  o.kappen = o.kappen ?? [];
  o.kappen.push({ naam: 'Toren', box: [[x0 - Wx, yf, 0], [x0 + Wx, yb, zT]], gesloten: true, openingen: [
    { wat: 'spleet onder de voorkap', mm: zb, box: [[x0 - Wx, yf - 1, 0], [x0 + Wx, yf + 1, zb]] }, { wat: 'spleet onder de achterkap', mm: zb, box: [[x0 - Wx, yb - 1, 0], [x0 + Wx, yb + 1, zb]] },
    { wat: 'spleet onder de zijkap L', mm: zb, box: [[x0 - Wx - 1, yf, 0], [x0 - Wx + 1, yb, zb]] }, { wat: 'spleet onder de zijkap R', mm: zb, box: [[x0 + Wx - 1, yf, 0], [x0 + Wx + 1, yb, zb]] }] });
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
function zitting(b, vl, y, z, lang = 360, breed = 320, opt = {}) {
  const Pl = b.P('bankLicht'), [, mx] = doos(vl);
  let p;
  if (opt.verstel) {
    // verstelbaar (P2-03): buitenkoker op de vloerligger, binnenkoker met gaten om de 45 mm, veerpen
    const zTop = z - 73 - Pl.h, pro2 = b.V.id !== 'thuis', ro = pro2 ? 'k100x100x4' : 'k80x80x4', ri = pro2 ? 'k80x80x4' : 'k60x60x3', zo = zTop - 120, zb0 = mx[2] + 5, s0 = zo - 40 - zb0;
    p = staander(b, 'Zitpaal', ro, vl.a[0], y, mx[2], zo, { gaten: [{ s: zo - mx[2] - 40, d: b.V.pin + 1, as: 'v' }] });
    const oud = b.huidig; b.groep('Zitting');
    b.staaf('Zitpaal binnenkoker', ri, [vl.a[0], y, zb0], [vl.a[0], y, zTop], { in: p.id, gaten: Array.from({ length: Math.min(4, Math.floor((zTop - zb0 - 40 - s0) / 45) + 1) }, (_, q) => ({ s: s0 + q * 45, d: b.V.pin + 1, as: 'v' })), opm: 'schuift in de zitpaal; gaten om de 45 mm: zitting in 3-4 standen' });
    const zb = b.staaf('Zitbalk', 'bankLicht', [vl.a[0], y - lang / 2 + 20, z - 73 - Pl.h / 2], [vl.a[0], y + lang / 2 - 20, z - 73 - Pl.h / 2]);
    b.plaat('Kussenplaat', [vl.a[0] - 70, y - 80, z - 73], [vl.a[0] + 70, y + 80, z - 68], { gaten: [[-50, -60], [50, -60], [50, 60], [-50, 60]].map(([dx, dy]) => ({ p: [vl.a[0] + dx, y + dy, z - 73], d: 9 })) });
    kussenOp(b, 'Zitting', zb, lang, breed, { op: 5 });
    b.groep(oud);
    b.pen('Veerpen zitting', [vl.a[0], y, zo - 40], X, { d: b.V.pin, key: b.V.pin25, snedes: 2, t: p.P.t, a: oud, b: 'Zitting', uit: [160, 0, 0], F: b.V.gebruiker, factor: 'extrinsiekPen', lengte: p.P.b + 40 });
    return { p, zb };
  }
  p = staander(b, 'Zitpaal', 'bank', vl.a[0], y, mx[2], z - 73 - Pl.h);
  const zb = b.staaf('Zitbalk', 'bankLicht', [vl.a[0], y - lang / 2 + 20, z - 73 - Pl.h / 2], [vl.a[0], y + lang / 2 - 20, z - 73 - Pl.h / 2]);
  b.plaat('Kussenplaat', [vl.a[0] - 70, y - 80, z - 73], [vl.a[0] + 70, y + 80, z - 68], { gaten: [[-50, -60], [50, -60], [50, 60], [-50, 60]].map(([dx, dy]) => ({ p: [vl.a[0] + dx, y + dy, z - 73], d: 9 })) });
  kussenOp(b, 'Zitting', zb, lang, breed, { op: 5 });
  return { p, zb };
}
/** voetjes op vrije punten (onder een gebogen voet): rubber + verborgen draadeind */
export function voetPunten(b, punten, naam) {
  const geo = punten.flatMap(([x, y]) => [balk([x, y, -12], [x, y, -5], X, 50, 50, true, 'rubber'), balk([x, y, -5], [x, y, 0], X, 17, 17, false, 'zink', { zes: true })]);
  b.koop(b.V.voetje, punten.length, geo, { naam: `${b.V.voetje === 'voetThuis' ? 'Stelvoet M10' : 'Rubbervoet M10'} onder ${naam}` });
  b.koop('lasmoerM10', punten.length, [], { naam: `Lasmoer M10 in ${naam} voor de stelvoet` });
}
/** voet vooraan (langs x) en vloerligger tot tegen de voorligger van de toren */
function vloer(b, T, x0 = T.x0, y0 = 0) {
  const a = b.P('ligger').b, P = b.P('ligger');
  // pro-vormtaal: de voorvoet als gebogen koker (pijlvorm, 1 bocht R = 3 x de hoogte), de uiteinden 150 mm naar achter
  const R = 3 * P.h, th = 2 * Math.atan(150 / 300), sag = R * (1 / Math.cos(th / 2) - 1);
  const vv = b.buis('Voorvoet', 'ligger', [[x0 - 300, y0 + P.b / 2 + 150, P.h / 2], [x0, y0 + P.b / 2, P.h / 2], [x0 + 300, y0 + P.b / 2 + 150, P.h / 2]], { vlak: [0, 0, 1], R, opm: `koker gebogen (1 bocht ${Math.round((th * 180) / Math.PI)}° R${R}): pijlvormige voorvoet` });
  voetPunten(b, [[x0 - 260, y0 + P.b / 2 + 130], [x0 + 260, y0 + P.b / 2 + 130]], 'de voorvoet');
  const [vmn] = doos(T.voor);
  const vl = b.staaf('Vloerligger', 'ligger', [x0, y0 + P.b / 2 + sag + P.b / 2 - 1, P.h / 2], [x0, vmn[1], P.h / 2]);
  void a; return { vv, vl };
}

export const KABEL = [
  {
    id: 'FK-01', soort: 'kabel', naam: 'Lat pulldown met gewichtstapel', kort: 'Lat pulldown met kniesteun en lage katrol, stapel 80/100 kg.',
    uitleg: 'Een gewichtstoren met een arm naar voren voor de latstang en een lage katrol vooraan de toren voor low row en curls. Zitting met kniesteun. Twee kabels aan de stapel: wat je niet gebruikt, hangt met de kogelstop tegen de katrol.',
    spieren: 'brede rugspier, biceps, achterkant schouder', oefeningen: ['lat pulldown', 'close grip pulldown', 'low row', 'triceps pushdown', 'curls'],
    markt: { thuis: [600, 2400], pro: [3490, 5920], bronT: 'Gorilla lat pulley 80 kg € 600, Taurus Lat Pulley Station € 999, Tunturi Platinum Dual Lat/Low Row € 2399', bronP: 'Taurus IT95 € 3490, Primal 125 kg Dual Lat/Row ± € 4070, Hammer Strength Select Lat Pulldown € 5920' },
    bouw(b) {
      const V = b.V, T = toren(b, { yt: 1200, H: 2150, ogen: [] }), r = T.r, a = T.a, yb = 420, P = b.P('ligger');
      // lat-arm: vlakovaalbuis die vooraan licht opbuigt (pro-vormtaal); de katrolbeugel B loopt tot onder de arm
      const Pb = b.P(b.V.id === 'thuis' ? 'o120x60x3' : 'frameO'), zArm = T.H + Pb.h / 2, opB = 120, arm = b.buis('Lat-arm', Pb.id, [[-60, T.yt + a / 2, zArm], [-60, T.yt - a / 2 - 220, zArm], [-60, yb - 60, zArm + opB]], { vlak: X, opm: `vlakovaalbuis, 1 bocht R${3 * Pb.h}; ligt op de bovenligger van de toren (gelast + schot), vooraan ${opB} mm hoger` });
      for (const s2 of [-1, 1]) b.staaf('Schetsplaat lat-arm', 's60x10', [-60 + s2 * (Pb.b / 2 + 5), T.yt + a / 2, T.H + 30], [-60 + s2 * (Pb.b / 2 + 5), T.yt - a / 2 - 150, T.H + 30], { v: X, kap: false, opm: 'schetsplaat 60 x 10 naast de arm, op de bovenligger en de arm gelast (vermoeiing)' });
      const pa = bovenKatrol(b, T, -60, 'voor', 'A (lat, boven de stapel)');
      const pb = katrolBeugel(b, 'B (lat, vooraan de arm)', [-60, yb, T.H - 15 - r], X, { tot: { as: 2, w: T.H + opB * ((T.yt - a / 2 - 220 - yb) / (T.yt - a / 2 - 220 - yb + 60)) - 4 }, kap: false });
      const pc = bovenKatrol(b, T, 60, 'voor', 'C (low, boven de stapel)'), pd = onderKatrol(b, T, 60, 'D (low, onderaan)');
      // één kabel: lat - B - A - losse katrol op de stapel - C - D - low-row-greep; stopkogel aan beide uiteinden. Trek je
      // aan de lat, dan houdt de stopkogel van de low row tegen D en tilt de losse katrol de stapel (2:1, greepweg 2 x 600)
      b.groep(`stapel ${T.s.naam}`);
      const zf = T.s.top + 25 + r + 5, pL = b.katrol('los (op de stapel)', [0, T.yt, zf], Y, { kap: true }); pL.kapTekst = 'binnen de afscherming van de stapel';
      for (const sy of [-1, 1]) b.plaat('Beugel losse katrol', [-30, T.yt + sy * 18, T.s.top], [30, T.yt + sy * 24, zf + 20], { stapel: true, kleur: 'stapel', gaten: [{ p: [0, T.yt + sy * 21, zf], d: 10.5 }], opm: 'op de bovenplaat gelast; as M10 van de losse katrol' });
      b.groep('frame');
      const zl = 1750, G = gewicht(b);
      b.koop(V.latbar, 1, [balk([-660, yb - r, zl], [540, yb - r, zl], Y, 30, 30, true, 'chroom')]);
      b.koop(V.handgreep, 1, [balk([60, T.yt - 3 * r - 400, T.a + 25], [60, T.yt - 3 * r - 260, T.a + 25], X, 30, 30, true, 'chroom')]);
      b.koop('kabelstop', 2, [], { naam: 'Stopkogel aan beide uiteinden (lat en low row)' });
      b.kabel('Kabel lat en low row', [{ p: [60, T.yt - 3 * r - 260, T.a + 25] }, pd, pc, pL, pa, pb, { p: [-60, yb - r, zl] }], { last: G, overbrenging: 2, slag: T.s.slag, begin: 'anker' });
      const { vl } = vloer(b, T);
      zitting(b, vl, yb + 20, 480, 360, 320, { verstel: true });
      // kniesteun verstelbaar: binnenkoker met gaten om de 25 mm in de kniepaal, veerpen
      const rk = pro(b) ? 'k80x80x4' : 'k60x60x3', Pk = b.P(rk), kp = staander(b, 'Kniepaal', pro(b) ? 'k100x100x4' : 'k80x80x4', 0, yb + 290, P.h, 600, { gaten: [{ s: 600 - P.h - 45, d: V.pin + 1, as: 'v' }] });
      kp.a = [0, yb + 290, P.h]; kp.geo = [balk(kp.a, kp.b, X, kp.P.b, kp.P.h)]; kp.L = 600 - P.h;
      b.groep('Kniesteun');
      const kbk = b.staaf('Kniepaal binnenkoker', rk, [0, yb + 290, 360], [0, yb + 290, 640], { in: kp.id, gaten: Array.from({ length: 4 }, (_, q) => ({ s: 195 - q * 45, d: V.pin + 1, as: 'v' })), opm: `schuift in de kniepaal; 4 gaten Ø${V.pin + 1} om de 45 mm: kniesteun in 4 standen` });
      const yk2 = yb + 290 - Pk.h / 2 - b.P('bus').b / 2;
      const kb = b.staaf('Kniesteunbus', 'bus', [-60, yk2, 660], [60, yk2, 660], { kap: false, opm: 'op de binnenkoker gelast; de as Ø25/30 schuift erin' });
      b.plaat('Kopplaat kniesteun', [-Pk.b / 2 - 5, yb + 290 - Pk.h / 2, 640], [Pk.b / 2 + 5, yb + 290 + Pk.h / 2, 648], { opm: 'sluit de binnenkoker af en draagt de bus' });
      b.staaf('As kniesteun', 'as', [-260, yk2, 660], [260, yk2, 660], { kap: false, in: kb.id });
      b.koop(V.schuimrol, 2, [-1, 1].map((s2) => balk([s2 * 65, yk2, 660], [s2 * 265, yk2, 660], X, 100, 100, true, 'leer')), { naam: 'Schuimrol Ø100 (kniesteun)' });
      b.groep('frame');
      b.pen('Veerpen kniesteun', [0, yb + 290, 600 - 45], X, { d: V.pin, key: V.pin25, snedes: 2, t: kp.P.t, a: 'frame', b: 'Kniesteun', uit: [160, 0, 0], F: V.gebruiker * 0.6, factor: 'extrinsiekPen', lengte: kp.P.b + 40 });
      void kbk;
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
      const { vl } = vloer(b, T);
      const zt = zitting(b, vl, 450, 430, 420, 320);
      // voetsteun in twee delen op twee dwarsliggers over de vloerligger: de kabel loopt in het midden tussen de voeten door
      const yv = T.yt - 3 * r - 490, kl = b.P('klein');
      for (const y of [yv + 4, yv + 170]) b.staaf('Dwarsligger voetsteun', 'klein', [-210, y, P.h + kl.h / 2], [210, y, P.h + kl.h / 2], { v: Y, opm: 'op de vloerligger gelast' });
      for (const s of [-1, 1]) {
        b.plaat('Voetsteun', [s > 0 ? 50 : -210, yv, P.h + kl.h], [s > 0 ? 210 : -50, yv + 8, 440], { opm: 'traanplaat 8 mm, antislip' });
        b.staaf('Schoor voetsteun', 'klein', [s * 130, yv + 8, 330], [s * 130, yv + 170, P.h + kl.h], { verstek: [40, 50], opm: 'schoor naar de achterste dwarsligger' });
      }
      const G = gewicht(b);
      b.koop(V.handgreep, 1, [balk([0, 650, 380 - 15], [0, 790, 380 - 15], X, 30, 30, true, 'chroom')]);
      b.kabel('Kabel row', [{ p: T.s.oog(0) }, pc, pd, { p: [0, 720, 380] }], { last: G, overbrenging: 1, slag: T.s.slag });
      void zt;
      b.reken('Voorligger toren (de kabel trekt horizontaal aan de onderkatrol)', T.voor, 'ligger', 2 * T.xs - T.a, 0, { g: 1.41 * G, proef: 'extrinsiek', dwars: true });
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
        const t = toren(b, { x0: s * x0, yt: 500, H: 2200, naam: k, voorVoet: pro(b) ? 750 : 950 }); // diepe voet: kantelen onder kabeltrek (P1-12)
        T[k] = t;
        const r = t.r, xin = s * x0 - s * t.xs, zc = t.zP;
        const pa = bovenKatrol(b, t, s * x0, s < 0 ? 'rechts' : 'links', `${k}1 (boven de stapel)`);
        void zc;
        const xb = xin - s * (t.a / 2 + 40 + r);
        const pb = katrolBeugel(b, `${k}2 (hoog binnen)`, [xb, t.yt, zc], Y, { tot: { as: 0, w: xin - s * t.a / 2 }, kap: false });
        gat(s < 0 ? t.sR : t.sL, [xin, t.yt, zc + r], 20, 'v');
        b.koop(V.handgreep, 1, [balk([xb - s * r, t.yt - 70, 1750], [xb - s * r, t.yt + 70, 1750], X, 30, 30, true, 'chroom')]);
        b.kabel(`Kabel ${k}`, [{ p: t.s.oog(0) }, pa, pb, { p: [xb - s * r, t.yt, 1750] }], { last: G, overbrenging: 1, slag: t.s.slag });
        b.trekLast('Kabeltrek naar voren aan de hoge katrollen', Math.min(600, G * 9.81), [xb, t.yt, zc], [0, -1, 0]);
      }
      b.groep('frame');
      bovenVerbinding(b, T.L, T.R);
      dwarsOp(b, 'Vloerligger', 'ligger', T.L.Rv, T.R.L, T.L.yt + 200);
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
      const ho = b.staaf('Schijfhouder slede', 'sleeve', [0, yt - a / 2, a + 300], [0, yt - a / 2 - 260, a + 300], {});
      b.plaat('Kabeloog slede', [b.P('staander').b / 2, yt - 20, a + 330], [b.P('staander').b / 2 + 8, yt + 20, a + 450], { gaten: [{ p: [b.P('staander').b / 2 + 4, yt, a + 415], d: 13 }] });
      b.koop('uhmw', 1, [], { naam: 'UHMW-glijstukken in de slede (4 x 300 x 40 x 10)', oppervlak: 4 * 0.3 * 0.04 });
      b.groep('frame');
      b.schijven([0, yt - a / 2 - 120, a + 300], [0, -1, 0], 3);
      // lat-arm: vlakovaalbuis die vooraan licht opbuigt (pro-vormtaal), zoals bij FK-01
      const Pb = b.P(b.V.id === 'thuis' ? 'o120x60x3' : 'frameO'), opB = 120, yk = yt - a / 2 - 220, arm = b.buis('Lat-arm', Pb.id, [[0, yt + a / 2, H + Pb.h / 2], [0, yk, H + Pb.h / 2], [0, 360, H + Pb.h / 2 + opB]], { vlak: X, opm: `vlakovaalbuis, 1 bocht R${3 * Pb.h}; ligt op de bovenligger, vooraan ${opB} mm hoger` });
      for (const s2 of [-1, 1]) b.staaf('Schetsplaat lat-arm', 's60x10', [s2 * (Pb.b / 2 + 5), yt + a / 2, H + 30], [s2 * (Pb.b / 2 + 5), yt - a / 2 - 150, H + 30], { v: X, kap: false, opm: 'schetsplaat 60 x 10 naast de arm, op de bovenligger en de arm gelast (vermoeiing)' });
      const zP = H - a - 15 - r, top = a + 415, xk = Pb.b / 2 + 34;
      const pa = katrolBeugel(b, 'A (boven de slede)', [xk, yt - r, zP], X, { tot: { as: 2, w: H - a }, kap: false });
      const pb = katrolBeugel(b, 'B (vooraan de arm)', [0, 420, H - 15 - r], X, { tot: { as: 2, w: H + opB * ((yk - 420) / (yk - 360)) - 4 }, kap: false });
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
      const V = b.V, T = toren(b, { yt: 1150, H: 2100, ogen: [-160, 160], slag: Math.round(100 * rad(100)) }), r = T.r, a = T.a, P = b.P('ligger'), G = gewicht(b), yp = 520, zc = T.zP + r;
      const Pb = b.P('breed'), arm = b.staaf('Bovenarm', 'breed', [0, T.yt - a / 2, T.H - Pb.h / 2], [0, yp - 200, T.H - Pb.h / 2], { v: X });
      const dw = b.staaf('Dwarsligger assen', 'ligger', [-260, yp, T.H - Pb.h - P.h / 2], [260, yp, T.H - Pb.h - P.h / 2], { v: Y });
      void dw;
      const katr = {};
      for (const [k, s] of [['L', -1], ['R', 1]]) katr[k] = bovenKatrol(b, T, s * 160, 'voor', `${k} (boven de stapel)`);
      for (const [k, s] of [['L', -1], ['R', 1]]) {
        b.groep(`Arm ${k}`);
        // nok R85: de kabel vertrekt aan de buitenkant van de nok (raaklijn op x = ±145, boven de stapel) en windt op als de arm
        // naar voren draait (was R55 met een radiaal bevestigde kabel: geen koppel in de beginstand)
        const xa = s * 60, zt = T.H - Pb.h - P.h, zn = zt - (s < 0 ? 120 : 140), Rn = 100, La = 250; // kussen op 250 mm: R/L = 40 % (P2-01)
        b.groep('frame');
        b.staaf('Lagerhuis', 'b76x8', [xa, yp, zt], [xa, yp, zt - 80], { boring: 62, kap: false, opm: 'buis 76,1x8 onder de dwarsligger gelast; uitgedraaid Ø62 H7 voor 2 kogellagers 6206' });
        b.groep(`Arm ${k}`);
        b.staaf('Draaias', 'r30', [xa, yp, zt - 2], [xa, yp, 1350], { kap: false, in: 'lagerhuis', opm: 'rond Ø30 h6 S355J2+C (lasbaar); 2 kogellagers 6206 in het lagerhuis, borgring DIN 471' });
        b.plaat(`Nok (R${Rn})`, [xa - Rn, yp - Rn, zn - 6], [xa + Rn, yp + Rn, zn + 6], { rond: true, in: 'draaias', opm: `laserschijf Ø${2 * Rn} x 12 met kabelgroef (2 platen + tussenring), op de as gelast` });
        const xk = xa + s * La, ar = b.staaf('Arm', 'arm', [xa, yp, 1350 - b.P('arm').h / 2], [xk, yp, 1350 - b.P('arm').h / 2], { v: Y });
        const pd = b.staaf('Kussenpaal', 'arm', [xk, yp, 1350 - b.P('arm').h], [xk, yp, 900]);
        b.kussen(`Armkussen ${k}`, [xk, yp - b.P('arm').b / 2, 950], [xk, yp - b.P('arm').b / 2, 1300], [0, -1, 0], 220, 60);
        b.staaf('Handgreep', 'greep', [xk, yp - b.P('arm').b / 2, 1320], [xk, yp - 180, 1320], {});
        b.groep('frame');
        b.kabel(`Kabel arm ${k}`, [{ p: T.s.oog(s * 160) }, katr[k], { p: [xa + s * Rn, yp, zn] }], { last: G, overbrenging: 1, slag: T.s.slag, einde: 'nok' });
        b.koop('lager6206', 2, [], { naam: `Kogellager 6206-2RS (draaias arm ${k})` });
        if (k === 'L') {
          b.reken('Arm (kussen op het einde)', ar, 'uitkrager', La, 0, { g: G * Rn / La, proef: 'extrinsiek', las: true });
          b.toets('Krachtsverhouding', 'Pec deck: kracht aan het kussen', `nok R${Rn} / kussen op ${La} mm: ${Math.round(Rn / La * 100)} % van de stapel per arm (${Math.round(G * Rn / La)} kg bij de volle stapel; was R55 met radiale kabel: 0 kg in de beginstand); stapelweg bij 100°: ${Math.round(Rn * 1.745)} mm`, 0, 'P2-01 (Fable): ± 40 %', { oordeel: 'info' });
        }
        void pd;
      }
      {
        // v8: een gesloten nokkast (gezette doos 1,5 mm) onder de dwarsligger rond beide nokken; alleen een gat voor elke
        // draaias en een sleuf per kabel aan de torenkant
        const zt = T.H - Pb.h - P.h, x1 = 185, y0 = yp - 125, y1 = yp + 125, z0 = zt - 175, z1 = zt - 2, t = 1.5, kind = [];
        b.groep('Afscherming nok');
        kind.push(b.contour('Nokkast', [0, 0, z0 + t / 2], X, Y, t, [[-x1, y0, 6], [x1, y0, 6], [x1, y1, 6], [-x1, y1, 6]], { kleur: 'kap', banden: 4, gaten: [{ x: -60, y: yp, d: 40 }, { x: 60, y: yp, d: 40 }], opm: 'bodem van de nokkast' }));
        kind.push(b.contour('Nokkast', [0, y0 + t / 2, 0], X, Z, t, [[-x1, z0], [x1, z0], [x1, z1], [-x1, z1]], { kleur: 'kap', banden: 3, opm: 'voorwand van de nokkast' }));
        kind.push(b.contour('Nokkast', [0, y1 - t / 2, 0], X, Z, t, [[-x1, z0], [x1, z0], [x1, z1], [-x1, z1]], { kleur: 'kap', banden: 3, uitsparingen: [-1, 1].map((s2) => { const x = s2 * 160, zz = zt - (s2 < 0 ? 120 : 140); return [[x - 12, zz - 20, 6], [x + 12, zz - 20, 6], [x + 12, zz + 20, 6], [x - 12, zz + 20, 6]]; }), opm: 'achterwand met 2 kabelsleuven 24 x 40 (met borstel)' }));
        for (const s2 of [-1, 1]) kind.push(b.contour('Nokkast', [s2 * (x1 - t / 2), 0, 0], Y, Z, t, [[y0, z0], [y1, z0], [y1, z1], [y0, z1]], { kleur: 'kap', banden: 3, opm: 'zijwand van de nokkast' }));
        const H = z1 - z0, W = 2 * x1, D = y1 - y0, os = terugzet(90, 3, t), ba = buigToeslag(90, 3, t), F = H - os + ba, Wf = W - 2 * os, Df = D - 2 * os;
        const pts = [[0, -F], [Wf, -F], [Wf, 0], [Wf + F, 0], [Wf + F, Df], [Wf, Df], [Wf, Df + F], [0, Df + F], [0, Df], [-F, Df], [-F, 0], [0, 0]];
        const zl = [[[0, -ba / 2], [Wf, -ba / 2]], [[Wf + ba / 2, 0], [Wf + ba / 2, Df]], [[Wf, Df + ba / 2], [0, Df + ba / 2]], [[-ba / 2, Df], [-ba / 2, 0]]].map(([a2, b2]) => ({ a: a2, b: b2, hoek: 90, R: 3, richting: 'op', ba }));
        b.gezet('Nokkast', kind, { t, uitslag: { punten: pts, zetlijnen: zl }, opm: `nokkast 1,5 mm DC01: bodem ${Math.round(W)} x ${Math.round(D)} met 4 randen ${Math.round(H)} mm gezet (Ri 3), hoeken dichtgelast; met 8 x M6 onder de dwarsligger` });
        b.o.kappen = b.o.kappen ?? []; b.o.kappen.push({ naam: 'Nokkast', box: [[-x1, y0, z0], [x1, y1, z1]], gesloten: true, openingen: [{ wat: 'kabelsleuf (borstel)', mm: 6, p: [160, y1, zt - 140] }] });
        b.o.knepen = b.o.knepen ?? []; for (const s2 of [-1, 1]) b.o.knepen.push({ naam: `kabel op de nok ${s2 < 0 ? 'L' : 'R'}`, p: [s2 * 160, yp, zt - (s2 < 0 ? 120 : 140)] });
        b.groep('frame');
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
        const wp = b.plaat('Muurplaat', [-70, Dm - t, z - 60], [70, Dm, z + 60], { gaten: [[-45, -35], [45, -35], [-45, 35], [45, 35]].map(([x, dz]) => ({ p: [x, Dm, z + dz], d: 14 })) });
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
  // P3-05 v8: de bovenligger is een gebogen boog in vlakovaal (2 x 2 bochten) met twee optrekgrepen erdoor, op de torens gebout
  const P = b.P(b.V.id === 'thuis' ? 'o120x60x3' : 'o120x60x4'), H = TL.H, oud = b.huidig, xL = TL.x0 - 120, xR = TR.x0 + 120, xm = (TL.x0 + TR.x0) / 2, z0 = H + P.b / 2, kr = Math.min(260, (TR.x0 - TL.x0) / 5); // staand: 60 hoog, 120 breed (vlakke boven- en onderkant)
  const pts = [[xL, TL.yt, z0], [TL.x0 + 160, TL.yt, z0], [xm - 150, TL.yt, z0 + kr], [xm + 150, TL.yt, z0 + kr], [TR.x0 - 160, TL.yt, z0], [xR, TL.yt, z0]];
  b.groep('Bovenligger met greep');
  const st = b.buis('Bovenligger met greep', P.id, pts, { vlak: [0, 1, 0], staand: true, R: 3 * P.b, opm: `boog in vlakovaal ${P.naam} (4 bochten R${3 * P.b}): ligt op de bovenliggers van de torens, ${kr} mm hoger in het midden; 2 optrekgrepen Ø32 onder de boog` });
  const zg = (x) => { const t = Math.min(1, Math.max(0, (Math.abs(x - xm) - 150) / (xm - 150 - TL.x0 - 160))); return z0 + kr * (1 - t); };
  for (const sx of [-1, 1]) { const x = xm + sx * 230; b.staaf('Optrekgreep', 'greep', [x, TL.yt - 220, zg(x) - P.b / 2 - 16], [x, TL.yt + 220, zg(x) - P.b / 2 - 16], { opm: 'buis Ø32 gekarteld, onder de vlakke onderkant van de boog gelast (neutrale greep)' }); }
  b.groep(oud);
  const bd = b.V.bout === 'boutM16' ? 18 : 14;
  for (const [T, links] of [[TL, true], [TR, false]]) {
    const pnt = [-1, 1].map((q) => [T.x0 + q * 40, T.yt, H]);
    for (const p of pnt) { const s0 = links ? p[0] - xL : st.L - (xR - p[0]); if (!st.gaten.some((g) => Math.abs(g.s - s0) < 0.5)) st.gaten.push({ s: Math.round(s0), d: bd, as: 'w' }); gat(T.boven, p, bd, Math.abs(T.boven.w[2]) > 0.5 ? 'w' : 'v'); }
    b.bout('Bovenligger op de toren', T.boven.groep, 'Bovenligger met greep', [T.x0, T.yt, H], Z, { punten: pnt, lengte: P.b + 60 + 50, uit: [0, 0, 160], F: b.V.gebruiker / 4 });
  }
  return st;
}
/** functional trainer of kabeltoren: één of twee torens met een rail aan de binnenkant, een wagen met katrol, 2:1 */
export function ftBouw(b, xs, id) {
  // Gesloten lus (zoals een commerciële functional trainer): wagenanker -> C (onderaan de rail) -> B2 (bovenaan de rail,
  // achter) -> A2 (boven de stapel, achter) -> losse katrol op de stapel (2:1) -> A (boven de stapel, voor) -> B (bovenaan
  // de rail, voor) -> dubbele zwenkkatrol op de wagen -> greep. Zakt de wagen Δ, dan wordt B-wagen Δ langer en
  // C-wagenanker Δ korter: de kabellengte blijft gelijk in elke stand van de wagen (getest in de hoogste en laagste).
  const V = b.V, G = gewicht(b), T = [], j = b.o.opties?.wagen ?? 13, zw = 250 + 75 * Math.max(3, Math.min(18, j));
  for (const [i, x0] of xs.entries()) {
    const k = xs.length > 1 ? (i ? 'R' : 'L') : '';
    b.groep(`Toren ${k}`.trim());
    const t = toren(b, { x0, yt: 600, H: 2150, naam: k, ogen: [], dpl: 100, voorVoet: xs.length > 1 ? 750 : 350 }), r = t.r, a = t.a, sIn = x0 === 0 ? 1 : -Math.sign(x0), yf = t.yt - 57.5, yb = t.yt + 57.5;
    T.push(t);
    const xr = x0 + sIn * (t.xs + a + 15), xd = xr + sIn * (a / 2 + 80), zPB = t.zP, railTop = zPB - r - 25 - 10, Pw = b.P('wagen');
    for (const [z0, z1] of [[a + 40, a + 180], [railTop - 150, railTop - 10]]) { const xa1 = x0 + sIn * (t.xs + a / 2), xa2 = xa1 + sIn * 15; b.plaat('Afstandhouder rail', [Math.min(xa1, xa2), t.yt - a / 2, z0], [Math.max(xa1, xa2), t.yt + a / 2, z1], { opm: 'tussen staander en rail gelast (15 mm ruimte voor de wagen)' }); }
    // rail tegen de binnenkant van de torenstaander, met 19 gaten om de 75 mm; railkop en katrolconsole voor de katrollen
    const rail = staander(b, 'Wagenrail', 'staander', xr, t.yt, a, railTop, { gaten: Array.from({ length: 19 }, (_, q) => ({ s: 250 + q * 75 - a, d: V.gat, as: 'w' })) });
    b.plaat('Railkop', [Math.min(xr - sIn * a / 2, xr + sIn * a / 2), t.yt - 82, railTop], [Math.max(xr - sIn * a / 2, xr + sIn * a / 2), t.yt + 82, railTop + 10], { opm: 'plaat 10 mm op de rail: draagt katrol B en B2' });
    b.plaat('Katrolconsole', [Math.min(x0 - sIn * 70, x0 + sIn * (r + 90)), t.yt - 82, t.H - a - 10], [Math.max(x0 - sIn * 70, x0 + sIn * (r + 90)), t.yt + 82, t.H - a], { gaten: [-1, 1].map((q) => ({ p: [x0 + q * 40, t.yt, t.H - a - 5], d: V.bout === 'boutM16' ? 18 : 14 })), opm: 'plaat 10 mm onder de bovenligger: draagt katrol A en A2; gat voor de bout van de bovenligger' });
    const xl = xr + sIn * (Pw.b / 2 + 16), xA = xl + sIn * 2 * r; // terugloop achter de rail
    const pA = katrolBeugel(b, `${k} A (boven de stapel, voor)`.trim(), [x0 + sIn * r, yf, t.zP], Y, { tot: { as: 2, w: t.H - a - 10 }, kap: false });
    const pA2 = katrolBeugel(b, `${k} A2 (boven de stapel, achter)`.trim(), [x0 + sIn * r, yb, t.zP], Y, { tot: { as: 2, w: t.H - a - 10 }, kap: false });
    const pB = katrolBeugel(b, `${k} B (bovenaan de rail, voor)`.trim(), [xd - sIn * r, yf, zPB], Y, { kap: false });
    const pB2 = katrolBeugel(b, `${k} B2 (bovenaan de rail, achter)`.trim(), [xA - sIn * r, yb, zPB], Y, { kap: false });
    const zC = a + 30 + r, pC = katrolBeugel(b, `${k} C (onderaan de rail, achter)`.trim(), [xl + sIn * r, yb, zC], Y, { rug: { as: 0, w: xr + sIn * a / 2 }, kapKant: [0, 0, -1] });
    // losse katrol op de stapel (as langs x: de twee lopen vallen voor en achter de stapel, binnen de afscherming)
    b.groep(`stapel ${t.s.naam}`);
    const zf = t.s.top + 25 + r + 5, pL = b.katrol(`${k} los (op de stapel)`.trim(), [x0, t.yt, zf], X, { kap: true }); pL.kapTekst = 'binnen de afscherming van de stapel';
    for (const sx of [-1, 1]) b.plaat('Beugel losse katrol', [x0 + sx * 18, t.yt - 30, t.s.top], [x0 + sx * 24, t.yt + 30, zf + 20], { stapel: true, kleur: 'stapel', gaten: [{ p: [x0 + sx * 21, t.yt, zf], d: 10.5 }], opm: 'op de bovenplaat gelast; as M10 van de losse katrol' });
    // wagen met dubbele zwenkkatrol (boven en onder de uitgaande kabel) en het anker van de terugloop
    b.groep(`Wagen ${k}`.trim());
    b.staaf('Wagen (buitenkoker)', 'wagen', [xr, t.yt, zw - 130], [xr, t.yt, zw + 130], { gaten: [{ s: 130, d: V.gat, as: 'w' }], in: rail.id, opm: 'binnenmaat 6 mm groter dan de rail; 4 UHMW-glijstukken 3 mm' });
    const kw = katrolBeugel(b, `${k} wagen (zwenk, boven)`.trim(), [xd + sIn * r, yf, zw], Y, { kapKant: [0, 0, 1], rug: { as: 0, w: xr + sIn * Pw.b / 2 }, groep: `Wagen ${k}`.trim(), tot: { as: 2, w: zw - 3 * r - 8 - 25 } });
    const k2 = b.katrol(`${k} wagen (zwenk, onder)`.trim(), [xd + sIn * r, yf, zw - 2 * r - 8], Y, { kap: true }); k2.kapTekst = 'in de verlengde beugel van de bovenste zwenkkatrol (dubbele zwenkkatrol)';
    b.plaat('Kabeloog wagen', [Math.min(xr + sIn * (Pw.b / 2 - 25), xl + sIn * 25), t.yt + Pw.b / 2, zw - 175], [Math.max(xr + sIn * (Pw.b / 2 - 25), xl + sIn * 25), yb + 25, zw - 115], { gaten: [{ p: [xl, yb, zw - 145], d: 13 }], opm: 'anker van de terugloop (geperst eindstuk + karabijn)' });
    b.koop('uhmw', 1, [], { naam: 'UHMW-glijstukken in de wagen (4 x 260 x 40 x 10)', oppervlak: 4 * 0.26 * 0.04 });
    b.groep(`Toren ${k}`.trim());
    b.pen(`Veerpen wagen ${k}`.trim(), [xr, t.yt, zw], Y, { d: V.pin, key: b.V.pin25, snedes: 2, t: b.P('staander').t, a: `Toren ${k}`.trim(), b: `Wagen ${k}`.trim(), uit: [sIn * 160, 0, 0], F: G, factor: 'extrinsiekPen', lengte: Pw.b + 40 });
    const xg = xd + sIn * (2 * r + 160);
    b.koop(V.handgreep, 1, [balk([xg, yf - 70, zw - r], [xg, yf + 70, zw - r], X, 30, 30, true, 'chroom')]);
    b.kabel(`Kabel ${k}`.trim(), [{ p: [xl, yb, zw - 145] }, pC, pB2, pA2, pL, pA, pB, kw, { p: [xg, yf, zw - r] }], { last: G, overbrenging: 2, slag: t.s.slag, begin: 'anker' });
    b.trekLast('Kabeltrek naar voren aan de hoogste stand', 600, [xg, yf, 1600], [0, -1, 0]);
    b.groep('frame');
  }
  if (xs.length > 1) {
    bovenVerbinding(b, T[0], T[1]);
    dwarsOp(b, 'Vloerligger', 'ligger', T[0].Rv, T[1].L, T[0].yt + 200);
    b.reken('Bovenligger (hangen of optrekken)', b.o.delen.find((d) => d.naam === 'Bovenligger met greep'), 'ligger', Math.abs(xs[1] - xs[0]), V.gebruiker, { proef: 'intrinsiek' });
  } else { b.o.verankerd = 'muur'; b.o.anker = { arm: 600, z: 1600, n: 4, kg: 0.5 * G }; }
  const t = T[0];
  b.reken('Wagenrail (kabel trekt zijwaarts aan de wagen)', b.o.delen.find((d) => d.naam === 'Wagenrail'), 'staanderM', 1200 - t.a, 0, { g: G / 2, proef: 'extrinsiek', e: 2 * t.r + 100, las: true, knik: 1 });
  b.last('Gebruiker voor de toren', 100, [xs[0], 0, 1000], { geval: 'trek' }); b.last('Stapel', G, [xs[0], t.yt, 1000], { geval: 'trek' });
  void id;
}

/** leg extension / leg curl / kickback: toren achteraan, hefboom met nok, kabel via onderkatrol naar de nok */
function beenMachine(b, soort) {
  // kabelbaan en nok buiten de zitting (x = -230), naast het been; de as ligt in TWEE lagerhuizen op twee lagerpalen
  // (links en rechts van de zitting): nok en hefboom zitten tussen de lagers (P1-05). Nok R200: aan de rol 48 % van de
  // stapel (was 24 % met R100), stapelweg R·θ (P2-02).
  const xl = -230, Rn = 200, V = b.V, G = gewicht(b), P = b.P('ligger'), Pb = b.P('bank'), hk = soort === 'extensie' ? -80 : soort === 'curl' ? 75 : 60, sg = Math.sign(hk), thMax = rad(Math.abs(hk)), T = toren(b, { x0: -155, yt: soort === 'kickback' ? 1700 : 1250, H: 1800, ogen: [xl + 155], slag: Math.round(Rn * thMax) }), r = T.r; // toren 140 mm naar links: het kabeloog ligt boven de nok
  const pa = bovenKatrol(b, T, xl, 'voor', 'A (boven de stapel)'), pd = onderKatrol(b, T, xl, 'B (onderaan)');
  const { vl } = vloer(b, T, 0);
  const yk = soort === 'kickback' ? 650 : 330, zk = soort === 'kickback' ? 950 : 560; // draaipunt (knie of heup)
  const xo = soort === 'kickback' ? 400 : 360, xh = xo - P.b / 2, Pas = b.P('r40');
  const huizen = [];
  for (const sx of [-1, 1]) {
    const paal = staander(b, 'Lagerpaal', 'ligger', sx * xo, yk, P.h, soort === 'curl' ? 760 : zk + 60);
    ligger(b, 'Dwarsvoet lagerpaal', 'ligger', vl, paal, { y: yk, z: P.h / 2 }, { as: 0 });
    const pv = b.staaf('Voet lagerpaal', 'ligger', [sx * xo, yk - 250, P.h / 2], [sx * xo, yk + 250, P.h / 2]); voetjes(b, pv, 2);
    huizen.push(b.staaf('Lagerhuis', 'b60x10', [sx * (xh - 60), yk, zk], [sx * xh, yk, zk], { boring: 44, kap: false, opm: 'buis Ø60,3 x 10 E355 naadloos (binnen Ø40,3), uitgedraaid Ø44 H7, Ra 1,6, voor 2 flensglijlagers GFM-4044-30; na het lassen draaien (P1-04)' }));
  }
  b.groep('Hefboom');
  const th = sg * thMax * b.stand, rot = (p) => { const dy = p[1] - yk, dz = p[2] - zk; return [p[0], yk + dy * Math.cos(th) - dz * Math.sin(th), zk + dy * Math.sin(th) + dz * Math.cos(th)]; };
  const as = b.staaf('As hefboom', 'r40', [-(xh - 1), yk, zk], [xh - 1, yk, zk], { kap: false, in: 'lagerhuis', opm: `rond Ø${Pas.b} h9 S355J2+C (lasbaar: de nok wordt erop gelast), in 2 lagerhuizen; stelringen DIN 705 buiten de huizen` });
  b.plaat(`Nok (R${Rn})`, [xl - 6, yk - Rn, zk - Rn], [xl + 6, yk + Rn, zk + Rn], { rond: true, in: 'as', opm: `laserschijf Ø${2 * Rn} x 12 met kabelgroef (2 platen Ø${2 * Rn} + tussenring), op de as gelast; kap erover` });
  const xa = 90;
  let lev, rol;
  if (soort === 'extensie' || soort === 'curl') {
    // N-P2-13 v7 (P2-03): de rol op een slede met een veerpen in 4 gaten: 340 / 373 / 407 / 440 mm van de as
    const dir = soort === 'extensie' ? [0, -60, -300] : [0, -420, 40], Ld = Math.hypot(...dir), u = [0, dir[1] / Ld, dir[2] / Ld], gL = [340, 373, 407, 440], Ls = soort === 'extensie' ? 340 : 440, gat = 17; // veerpen Ø16 (koker 60: randafstand ≥ 1,5 x Ø)
    lev = b.staaf('Hefboomarm', 'arm', [xa, yk, zk], rot(add([xa, yk, zk], mul(u, 480))), { v: X, gaten: gL.map((s2) => ({ s: s2, d: gat, as: 'v' })), opm: `koker met 4 gaten Ø${gat} op ${gL.join('/')} mm: de rolslede met een veerpen (lengte van het been)` });
    const sl = V.id === 'thuis' ? 'k60x60x3' : 'k70x70x4', ps = (d) => rot(add([xa, yk, zk], mul(u, Ls + d)));
    b.staaf('Rolslede', sl, ps(-40), ps(40), { v: X, in: lev.id, kap: false, gaten: [{ s: 40, d: gat, as: 'v' }], opm: `koker ${sl.slice(1)} 80 mm over de arm (PE-glijstrips): de rol op ${gL.join(' / ')} mm, nu ${Ls} mm` });
    b.koop('pullpin16', 1, [], { naam: 'Veerpen Ø16 rolslede (lengte van de rolarm)' });
    rol = rot(add([0, yk, zk], mul(u, Ls + 10)));
  }
  else { lev = b.staaf('Hefboomarm', 'arm', [xa, yk, zk], rot([xa, yk + 120, 250]), { v: X }); rol = rot([0, yk + 130, 240]); }
  if (soort !== 'kickback') {
    b.staaf('As rol', 'as', [-200, rol[1], rol[2]], [200, rol[1], rol[2]], { kap: false, in: lev.id });
    b.koop(V.schuimrol, 2, [-1, 1].map((s2) => balk([s2 * 30, rol[1], rol[2]], [s2 * 180, rol[1], rol[2]], X, 100, 100, true, 'leer')), { naam: 'Schuimrol Ø100 (scheen of enkel)' });
  } else b.staaf('Voetplaat kickback', 'pl10x300', [-40, rol[1], rol[2]], [180, rol[1], rol[2]], { v: norm(sub(rot([0, yk + 131, 240]), rot([0, yk + 130, 240]))), kap: false, opm: 'plaat 300 x 220 x 10 met rubber' });
  b.groep('frame');
  b.koop('glij40', 4, [], { naam: 'Flensglijlager GFM-4044-30 in de 2 lagerhuizen (2 per huis)' });
  b.koop('stelring40', 2, [], { naam: 'Stelring DIN 705 Ø40 op de as van de hefboom' });
  for (const sx of [-1, 1]) b.pen(`As hefboom in het lagerhuis ${sx < 0 ? 'L' : 'R'}`, [sx * (xh - 30), yk, zk], X, { d: Pas.b, lengte: 58, snedes: 1, t: 8, a: 'frame', b: 'Hefboom', uit: [-200, 0, 0], F: G * 0.6, factor: 'extrinsiekPen', gelast: 'As hefboom' });
  {
    // as op buiging: ligger op 2 steunpunten (lagerhuizen), kabelkracht aan de nok en beenkracht aan de arm
    const kf = 2.5, Fc = kf * 1.5 * G * 9.81, Fl = Fc * Rn / 420, Ls = 2 * (xh - 30), xc = xl + Ls / 2, xb = xa + Ls / 2;
    const Mc = Fc * xc * (Ls - xc) / Ls, Ml = Fl * xb * (Ls - xb) / Ls, M = Mc + Ml, W = Math.PI * Pas.b ** 3 / 32, sg = M / W;
    b.toets('Sterkte', 'As van de hefboom op buiging (2 lagers)', `proeflast kabel ${kf} · 1,5 · ${G} kg · g = ${(Fc / 1000).toFixed(2)} kN aan de nok (${Math.round(xc)} mm van het lager), been ${(Fl / 1000).toFixed(2)} kN aan de arm; overspanning ${Ls} mm: M ≤ ${(M / 1e6).toFixed(3)} kNm; W(Ø${Pas.b}) = ${Math.round(W)} mm³: σ = ${sg.toFixed(0)} N/mm² ≤ 235 (was eenzijdig: ${(Fc * 250 / W).toFixed(0)} N/mm²)`, sg / 235, 'EN 1993-1-1 §6.2.5 (as op 2 steunpunten)');
    b.toets('Krachtsverhouding', 'Nok: kracht aan de rol tegenover de stapel', `nok R${Rn} / arm 420 mm = ${(Rn / 420 * 100).toFixed(0)} % van de stapel aan de rol (${Math.round(G * Rn / 420)} kg bij de volle stapel); stapelweg R·θ = ${Math.round(Rn * 1.4)} mm bij 80°`, 0, 'P2-02 (Fable): commercieel ± 50-100 % aan de enkel', { oordeel: 'info' });
  }
  // vloerkatrol onder het raakpunt aan de opwikkelkant (P1-01 v6: bij de leg extension vóór de as)
  // N-P1-05 v7: de vloerkatrol altijd aan de torenkant van de verticale kabel (de kabel komt van de toren): yf = yr + r
  const yr = yk + sg * Rn, yf = yr + r, zf = T.a + 25 + r, pf = katrolBeugel(b, 'C (vloer, onder de nok)', [xl, yf, zf], X, { kapKant: [0, 0, 1] });
  b.plaat('Console vloerkatrol', [xl + 24, yf - 40, T.a - 10], [-P.b / 2, yf + 40, T.a], { opm: 'verbindt de katrolbeugel met de vloerligger' });
  b.groep('frame');
  b.kabel('Kabel', [{ p: T.s.oog(xl + 155) }, pa, pd, pf, { p: [xl, yr, zk] }], { last: G, overbrenging: 1, slag: T.s.slag, einde: 'nok', opgewikkeld: Math.round(Rn * Math.abs(th)), raak: [xl, yr, zk] });
  b.o.nok = { Rn, L: 420, G, kracht: (G * Rn) / 420, grens: 0, slag: T.s.slag, zin: sg, as: [yk, zk], thMax };
  // v8 (N-P1-02 ook op FK): één gesloten nokkap rond de nok (volle schijf) en de vloerkatrol, en een vloergoot tot bij katrol B
  b.groep('Afscherming nok');
  nokKappen(b, { xl, yk, zk, Rn, m0: 0, m1: 2 * Math.PI - 0.3, sg: 1, thMax: 0, rn: r, yf, zf, zc: zf - r, aT: T.a, yr });
  vloerGoot(b, { xl, yf, rn: r, zc: zf - r, T, aT: T.a, tot: pd.c[1] - r - 30 });
  b.groep('frame');
  if (soort === 'kickback') {
    for (const y of [400, 850].map((y0) => (Math.abs(y0 - yf) < 42 + P.b / 2 ? (y0 < yf ? yf - 42 - P.b / 2 : yf + 42 + P.b / 2) : y0))) { const pl = b.staaf('Platformligger', 'ligger', [-300, y, P.h / 2], [-P.b / 2, y, P.h / 2], { opm: 'tegen de vloerligger gelast' }); voetjes(b, pl, 1); }
    for (const [x0p, x1p] of [[-300, xl - 40], [xl + 40, 300]]) b.plaat('Platform', [x0p, 350, P.h], [x1p, 900, P.h + 8], { opm: 'traanplaat 8 mm; de kabel en de vloerkatrol in de spleet ertussen' });
    const kp = staander(b, 'Kussenpaal', 'bank', 0, 300, P.h, 1250);
    b.kussen('Borstkussen', [0, 300 + Pb.h / 2, 1000], [0, 300 + Pb.h / 2, 1300], [0, 1, 0], 300, 68);
    for (const s of [-1, 1]) b.staaf('Handgreep', 'greep', [s * Pb.b / 2, 300, 1180], [s * 300, 300, 1180], {});
    void kp;
  } else {
    zitting(b, vl, yk + 260, 480, 300, 320);
    const rp = staander(b, 'Rugpaal', 'bank', 0, yk + 470, P.h, 1100);
    b.kussen('Rugleuning', [0, yk + 470 - Pb.h / 2, 560], [0, yk + 470 - Pb.h / 2, 1100], [0, -1, 0], 320, 68);
    for (const s of [-1, 1]) b.staaf('Handgreep', 'greep', [s * Pb.b / 2, yk + 470, 500], [s * 280, yk + 470, 500], {});
    if (soort === 'curl') { const Pl = b.P('licht'); b.staaf('Dijklem', 'licht', [xo - P.b / 2, yk, 730], [-170, yk, 730], { v: Y }); b.kussen('Dijkussen', [-160, yk, 730 - Pl.h / 2], [160, yk, 730 - Pl.h / 2], [0, 0, -1], 120, 60); }
    void rp;
  }
  b.reken('Hefboomarm (kracht aan de rol of de voetplaat)', lev, 'uitkrager', 420, 0, { g: G * 100 / 420, proef: 'extrinsiek', las: true, dwars: true });
  b.reken('Lagerpaal (één van de twee)', b.o.delen.find((d) => d.naam === 'Lagerpaal'), 'staanderM', zk - P.h, 0, { g: G / 2, proef: 'extrinsiek', e: 300, las: true });
  b.last('Gebruiker', 100, [0, yk + 230, 800], { geval: 'been' }); b.last('Stapel hoog', G, [0, T.yt, 1000], { geval: 'been' });
  void as;
}
export { bovenKatrol, onderKatrol, vloer, zitting, gewicht, R as katrolStraal, pro as isPro };
