// Strongman en buiten (FX-..). Strongman-werktuigen (juk, farmers, frame carry, deadlift-frame, slee, log, axle,
// laadpaal, stenenplatform) in de vormtaal van Rogue: mat zwart, laadpennen Ø48 (chroom of zwart), gelaserde
// zijplaten met ronde hoeken. Buitentoestellen (calisthenics) volgens EN 16630: ronde palen Ø76/Ø89 in een betonpoer,
// thermisch verzinkt + poedercoat (duplex), stangen Ø30-35, sporten met een vrije opening buiten 89-230 mm, de vrije
// valhoogte (greephoogte min 1 m bij hangen) en de valruimte (X = 2/3·Y + 0,5 m, min. 1,5 m) als context, en een
// infobord. Node en browser.
import { staander, voetjes, X, Y, Z, balk } from './bouwstenen.mjs';
import { mt } from './bouwstenen.mjs';
import { add, mul, norm, sub, len, aabb, gatenRij } from './model.mjs';
import { cirkelPunten } from './vorm.mjs';

const pro = (b) => b.V.id !== 'thuis';
const MATEN = ['compact', 'standaard', 'XL'];
const BRON16630 = 'EN 16630:2015 (permanent geïnstalleerde buitenfitnesstoestellen); samenvatting tolymp.de en sportsequip.co.uk';
const VEILIG = 'AANNAME: strongman-werktuigen vallen buiten EN ISO 20957; proeflast 2,5 x de last zoals bij de intrinsieke proef';

// ------------------------------------------------------------------ strongman
/** gelaste eindplaat met ronde bovenhoeken op beide uiteinden van een voetbalk */
function eindplaten(b, d, r = 15) {
  const t = 8, hx = d.P.b / 2 + 3, z0 = -d.P.h / 2, z1 = d.P.h / 2 + 3;
  for (const [e, u] of [[d.a, mul(d.u, -1)], [d.b, d.u]]) b.contour('Eindplaat voet', add(e, mul(u, t / 2)), norm([u[1], -u[0], 0]), Z, t, [[-hx, z0, 0], [hx, z0, 0], [hx, z1, r], [-hx, z1, r]], { banden: 4, opm: `eindplaat ${t} mm met ronde hoeken R${r}, sluit de voetbalk, rondom gelast` });
}
/** laadpen Ø48,3 x 8 S355 van punt p in richting dir, lengte L, met een kraag (ring 10 mm) aan de voet */
function laadpen(b, p, dir, L = 300, naam = 'Laadpen') {
  const d = norm(dir);
  b.contour('Kraag laadpen', add(p, mul(d, 5)), Math.abs(d[2]) > 0.9 ? X : norm([d[1], -d[0], 0]), Math.abs(d[2]) > 0.9 ? Y : Z, 10, cirkelPunten(0, 0, 50, 20), { banden: 6, opm: 'kraag Ø100 x 10, gelaserd, rondom gelast: de schijven schuiven niet tot tegen het frame' });
  return b.staaf(naam, 'b48x8s', add(p, mul(d, 10)), add(p, mul(d, 10 + L)), { opm: 'buis Ø48,3 x 8 S355J2H (3.1-certificaat): Ø50-schijven tot aan de kraag; eindkap; zwart gepassiveerd (P3-09)' });
}
/** stalen sleepstrip (Hardox 400, 8 mm) onder een voetbalk: het juk wordt neergezet en gesleept (P2-08) */
function sleepstrip(b, d) {
  const [x0, y0] = [Math.min(d.a[0], d.b[0]) - d.P.b / 2, Math.min(d.a[1], d.b[1])], [x1, y1] = [Math.max(d.a[0], d.b[0]) + d.P.b / 2, Math.max(d.a[1], d.b[1])];
  return b.plaat('Sleepstrip', [x0, y0 + 20, 0], [x1, y1 - 20, 8], { opm: 'Hardox 400, 8 mm, onder de voetbalk gelast (vervangbaar): slijt in plaats van de voet' });
}
/** schetsplaat (driehoek 8 mm) voor en achter de staander op de voetbalk */
function schetsplaten(b, s, zv, L = 150) {
  const a = s.P.b;
  for (const sy of [-1, 1]) b.contour('Schetsplaat', [s.a[0], sy * a / 2, zv], [0, sy, 0], Z, 8, [[0, 0], [L, 0], [L, 12], [12, L], [0, L]], { banden: 6, opm: 'schetsplaat 8 mm, hoek afgeschuind, tegen de staander en op de voetbalk gelast (wringen bij het lopen)' });
}
/** juk (yoke): 2 staanders op voetbalken met sleepstrips en schetsplaten, een verstelbare jukbalk op 2 pennen Ø25 in
 *  gaten om de 50 mm, nekkussen, dwarsligger achteraan, laadpennen van 450 mm opzij (P2-08) */
export function juk(b, def, c) {
  const rolS = pro(b) ? 'staander' : 'k80x80x3', P = b.P(rolS), a = P.b, H = mt(b, c.H ?? 1500, [-150, 150]), W = c.W ?? 1150, G = def.maxLast?.[b.V.id] ?? 300, xs = [-W / 2, W / 2], zv = a + 8, pen = 25, Lp = c.pen ?? 450;
  // gaten Ø26 om de 50 mm in het bovenste stuk van de staander (jukbalk van H − 400 tot H − 100)
  const sG = (z) => z - zv, gat = gatenRij(sG(H - 400), sG(H - 100), 50, pen + 1, 'w');
  const zj = H - 100 - 50 * Math.round(Math.max(0, (c.stand ?? 0)));
  const st = xs.map((x) => {
    b.groep(`Zijframe ${x < 0 ? 'L' : 'R'}`);
    const voet = b.staaf('Voetbalk', rolS, [x, -450, zv - a / 2], [x, 450, zv - a / 2]); eindplaten(b, voet); sleepstrip(b, voet);
    const s = staander(b, 'Staander', rolS, x, 0, zv, H, { gaten: gat });
    schetsplaten(b, s, zv);
    b.contour('Kopplaat', [x, 0, H + 4], X, Y, 8, [[-a / 2 - 5, -a / 2 - 5, 6], [a / 2 + 5, -a / 2 - 5, 6], [a / 2 + 5, a / 2 + 5, 6], [-a / 2 - 5, a / 2 + 5, 6]], { banden: 4, opm: 'kopplaat 8 mm, ronde hoeken, rondom gelast' });
    laadpen(b, [x + Math.sign(x) * a / 2, 0, zv + 260 - a], [Math.sign(x), 0, 0], Lp);
    return s;
  });
  // jukbalk met beugels (U-zadel om de staander) en 2 pennen Ø25 door de gaten: verstelbaar per 50 mm
  b.groep('Jukbalk');
  const jb = b.staaf('Jukbalk', rolS, [-W / 2 + a / 2, 0, zj], [W / 2 - a / 2, 0, zj], { opm: 'tussen de jukbeugels gelast; verstelbaar per 50 mm (2 pennen Ø25 met borgveer)' });
  for (const [i, s] of st.entries()) {
    const x = xs[i], sx = Math.sign(x);
    for (const sy of [-1, 1]) b.plaat('Jukbeugel', [x + sx * (a / 2 + 30), sy * (a / 2), zj - 70], [x - sx * (a / 2 + 90), sy * (a / 2 + 8), zj + 70], { gaten: [{ p: [x, sy * (a / 2), zj], d: pen + 1 }], opm: 'beugel 8 mm voor en achter de staander (U-zadel), gat Ø26 voor de pen; de jukbalk ertussen gelast' });
    b.pen(`Pen jukbalk ${sx < 0 ? 'L' : 'R'}`, [x, 0, zj], [0, 1, 0], { d: pen, lengte: a + 16 + 20, snedes: 2, t: P.t, fy: 355, F: G / 2, factor: 'intrinsiekPen', a: `Zijframe ${sx < 0 ? 'L' : 'R'}`, b: 'Jukbalk', uit: [0, -140, 0], key: 'pullpin25' });
    void s;
  }
  b.kussen('Nekkussen', [-260, 0, zj - a / 2], [260, 0, zj - a / 2], [0, 0, -1], 140, 70);
  b.groep('frame');
  b.staaf('Dwarsligger', rolS, [-W / 2 + a / 2, 400, zv - a / 2], [W / 2 - a / 2, 400, zv - a / 2], { opm: 'tussen de voetbalken achteraan gelast' });
  b.reken('Jukbalk (volle last op de schouders)', jb, 'ligger', W - a, 0, { g: G, proef: 'intrinsiek' });
  b.reken('Laadpen (helft van de last, uitkragend)', b.o.delen.find((d) => d.naam === 'Laadpen'), 'uitkrager', Lp, 0, { g: Math.round(G * 0.4), proef: 'intrinsiek', las: true, kraag: 100 });
  b.last('Last op het juk', G, [0, 0, H], { geval: 'vol' });
  b.o.juk = { pen: Lp, schijven25: Math.floor((Lp - 20) / 30) };
}
/** farmers walk (paar): hoofdbuis met laadpennen, verhoogde greep (vrij 180 mm) tussen twee zijplaten, standpoten met
 *  een stalen voetplaat (P2-10) */
export function farmers(b, def, c) {
  const P = b.P('licht'), a = P.b, zc = 225, G = def.maxLast?.[b.V.id] ?? 200, Lp = mt(b, c.pen ?? 400, [-100, 100]), gv = 180;
  for (const sx of c.paar === false ? [0] : [-1, 1]) {
    const x = sx * 350;
    b.groep(`Handvat ${sx < 0 ? 'L' : sx > 0 ? 'R' : ''}`.trim());
    const hb = b.staaf('Hoofdbuis', 'licht', [x, -200, zc], [x, 200, zc], { opm: 'koker; de laadpennen ertegen gelast' });
    for (const sy of [-1, 1]) {
      laadpen(b, [x, sy * 200, zc], [0, sy, 0], Lp);
      b.staaf('Standpoot', 'klein', [x, sy * 140, zc - a / 2], [x, sy * 140, 8], { opm: 'onder de hoofdbuis gelast; stalen voetplaat eronder' });
      b.plaat('Voetplaat', [x - 40, sy * 140 - 40, 0], [x + 40, sy * 140 + 40, 8], { opm: 'voetplaat 8 mm (staal, geen rubber: het handvat valt op de grond)' });
    }
    const zt = zc + a / 2, zg = zt + 100;
    for (const sy of [-1, 1]) b.contour('Greepplaat', [x, sy * (gv / 2 + 5), 0], X, Z, 10, [[-45, zt, 0], [45, zt, 0], [28, zt + 135, 16], [-28, zt + 135, 16]], { banden: 6, opm: 'gelaserd 10 mm, ronde kop, op de hoofdbuis gelast; gat Ø32 voor de greep' });
    b.staaf('Greep', 'greep', [x, -gv / 2, zg], [x, gv / 2, zg], { opm: `buis Ø32 gekarteld, ${gv} mm vrij tussen de greepplaten (met krijt)` });
    void hb;
  }
  b.groep('frame');
  b.reken('Hoofdbuis (laadpennen vol, greep in het midden)', b.o.delen.find((d) => d.naam === 'Hoofdbuis'), 'ligger', 400, 0, { g: Math.round(G / 2), proef: 'intrinsiek' });
  b.reken('Laadpen (een kant vol)', b.o.delen.find((d) => d.naam === 'Laadpen'), 'uitkrager', Lp, 0, { g: Math.round(G / 4), proef: 'intrinsiek', las: true });
  b.last('Last in de handen', G, [0, 0, zc], { geval: 'vol' });
}
/** frame carry of deadlift-frame: 2 langsbalken, 2 dwarsliggers, verhoogde grepen op 2 paaltjes per kant, verticale laadpennen */
export function frameCarry(b, def, c) {
  const P = b.P('staander'), a = P.b, L = mt(b, c.L ?? 1700, [-200, 300]), B = c.B ?? 720, zg = c.zg ?? 650, G = def.maxLast?.[b.V.id] ?? 300, Pl = b.P('licht');
  for (const sx of [-1, 1]) {
    const x = sx * B / 2;
    b.groep(`Zijframe ${sx < 0 ? 'L' : 'R'}`);
    const rail = b.staaf('Langsbalk', 'staander', [x, -L / 2, a / 2], [x, L / 2, a / 2], { opm: 'koker, eindplaten' }); voetjes(b, rail, 2); eindplaten(b, rail);
    for (const y of [-220, 220]) staander(b, 'Greeppaal', 'licht', x, y, a, zg + Pl.b / 2 + 30);
    b.staaf('Greep', c.dik ? 'b48x8' : 'stang', [x, -220 + Pl.b / 2, zg], [x, 220 - Pl.b / 2, zg], { opm: c.dik ? 'dikke greep Ø48 (grip-training), gekarteld' : 'rond Ø35-38 gekarteld, tussen de paaltjes gelast' });
    for (const y of [-L / 2 + 160, L / 2 - 160]) laadpen(b, [x, y, a], Z, 300);
  }
  b.groep('frame');
  for (const y of [-L / 2 + 40, L / 2 - 40]) b.staaf('Dwarsligger', 'licht', [-B / 2 + a / 2, y, a / 2], [B / 2 - a / 2, y, a / 2], { opm: 'tussen de langsbalken gelast; binnen ± 640 mm vrij voor de gebruiker' });
  b.reken('Langsbalk (last op de laadpennen, gedragen aan de greep)', b.o.delen.find((d) => d.naam === 'Langsbalk'), 'uitkrager', L / 2 - 220 - 160, 0, { g: Math.round(G / 4), proef: 'intrinsiek' });
  b.reken('Greep (halve last)', b.o.delen.find((d) => d.naam === 'Greep'), 'ligger', 440 - Pl.b, 0, { g: Math.round(G / 2), proef: 'intrinsiek' });
  b.last('Last', G, [0, 0, 300], { geval: 'vol' });
}
/** slee: twee glijders (gebogen buis) met een UHMW-slijtstrip, bodemplaat 6 mm op 2 ribben, laadpen, duwpalen 60 x 60 x 4
 *  met een hoge en een lage greep (prowler) of alleen een trekoog. Duwkracht uit de wrijving (P2-09). */
export function slee(b, def, c) {
  const G = def.maxLast?.[b.V.id] ?? 150, zs = 40, zb = zs + 30, tb = 6, mu = 0.5;
  for (const sx of [-1, 1]) {
    b.buis('Glijder', 'b60x3', [[sx * 300, -450, zs], [sx * 300, 350, zs], [sx * 300, 520, zs + 110]], { vlak: X, R: 190, kap: true, opm: 'buis Ø60,3 gebogen (opstaande neus); UHMW-slijtstrip eronder' });
    b.koop('uhmw', 1, [balk([sx * 300, -440, 5], [sx * 300, 340, 5], X, 40, 10, false, 'uhmw')], { naam: 'Slijtstrip UHMW 40 x 10 onder de glijder (vervangbaar, verzonken bouten M6)', oppervlak: 0.04 * 0.78 });
  }
  b.contour('Bodemplaat', [0, -50, zb + tb / 2], X, Y, tb, [[-335, -400, 30], [335, -400, 30], [335, 300, 30], [-335, 300, 30]], { banden: 8, opm: `bodemplaat ${tb} mm, ronde hoeken R30, op de glijders en 2 ribben gelast` });
  for (const y of [-300, 150]) b.staaf('Ribbe bodem', 's50x8', [-270, y, zb - 25], [270, y, zb - 25], { v: Y, kap: false, opm: 'platstaal 50 x 8 onder de bodemplaat, tussen de glijders' });
  laadpen(b, [0, 0, zb + tb], Z, 350);
  b.contour('Trekoog', [0, 215, zb + tb], X, Z, 12, [[-60, 0, 0], [60, 0, 0], [60, 120, 25], [-60, 120, 25]], { gaten: [{ x: 0, y: 60, d: 30 }], banden: 6, opm: 'trekoog 12 mm met gat Ø30 voor de karabijn van het trektuig' });
  const msl = 64;
  if (c.duw) {
    const H = mt(b, 1100, [-100, 100]);
    for (const sx of [-1, 1]) staander(b, 'Duwpaal', 'k60x60x4', sx * 250, -330, zb + tb, H);
    for (const z of [H - 60, 600]) b.staaf('Greep', 'greep', [-250 + 30, -330, z], [250 - 30, -330, z], { opm: 'buis Ø32, tussen de duwpalen gelast (hoog en laag duwen)' });
    // duwkracht = wrijving μ·(last + slee), μ = 0,5 op kunstgras (AANNAME), per paal de helft
    b.reken(`Duwpaal (duwkracht μ·(last + slee) = 0,5 · (${G} + ${msl}) kg, per paal de helft)`, b.o.delen.find((d) => d.naam === 'Duwpaal'), 'uitkrager', H - zb - tb, 0, { g: Math.round((mu * (G + msl)) / 2), proef: 'intrinsiek', las: true });
  }
  b.reken('Glijder onder de bodemplaat', b.o.delen.find((d) => d.naam === 'Glijder'), 'ligger', 800, 0, { g: Math.round(G / 2), proef: 'intrinsiek' });
  b.last('Last op de slee', G, [0, 0, 200], { geval: 'vol' });
}
/** log: romp 1200 mm in buis Ø273 x 4 (thuis Ø219 x 3), kopplaten, 2 neutrale grepen in uitsparingen, laadpennen van
 *  400 mm: leeg ± 30-50 kg zoals de merklogs (P1-07) */
export function log(b, def, c) {
  const prof = pro(b) ? 'b273x4' : 'b219x3', L = mt(b, c.L ?? 1200, [-100, 200]), Pd = b.P(prof), R = Pd.b / 2, zc = R, G = def.maxLast?.[b.V.id] ?? 120;
  b.o.verankerd = 'los';
  const lg = b.staaf('Log', prof, [-L / 2, 0, zc], [L / 2, 0, zc], { kap: false, opm: `buis ${Pd.naam}, 2 uitsparingen 170 x 160 voor de grepen (gelaserd), randen gebroken` });
  for (const s of [-1, 1]) { b.contour('Kopplaat log', [s * (L / 2 + 5), 0, zc], Y, Z, 10, cirkelPunten(0, 0, R, 32), { banden: 10, opm: `kopplaat Ø${Math.round(2 * R)} x 10, rondom gelast` }); laadpen(b, [s * (L / 2 + 10), 0, zc], [s, 0, 0], 400); }
  b.o.pronk = b.o.pronk ?? [];
  for (const xg of [-300, 300]) {
    b.staaf('Handvat log', 'stang', [xg, -R + 30, zc], [xg, R - 30, zc], { in: lg.id, kap: false, opm: 'rond Ø35-38 gekarteld, door beide wanden gelast (neutrale greep)' });
    b.o.pronk.push(balk([xg - 85, -R - 0.6, zc + 20], [xg + 85, -R - 0.6, zc + 20], Z, 160, 1, false, 'gat'), balk([xg - 85, -R + 30, zc + R + 0.6], [xg + 85, -R + 30, zc + R + 0.6], Y, 120, 1, false, 'gat'));
  }
  b.reken('Log (last op de laadpennen, gedragen aan de grepen)', lg, 'ligger', L, 0, { g: G, proef: 'intrinsiek' });
  b.reken('Handvat log', b.o.delen.find((d) => d.naam === 'Handvat log'), 'ligger', 2 * R, 0, { g: Math.round(G / 2), proef: 'intrinsiek' });
  b.last('Log met schijven', G, [0, 0, zc], { geval: 'vol' });
}
/** axle: dikke stang Ø48 (S355) met 2 kragen, op de kragen op de vloer */
export function axle(b, def, c) {
  const L = 2130, G = def.maxLast?.[b.V.id] ?? 200, zc = 60;
  b.o.verankerd = 'los';
  const st = b.staaf('Axle', 'b48x8s', [-L / 2, 0, zc], [L / 2, 0, zc], { opm: 'buis Ø48,3 x 8 S355J2H (2"-greep, 3.1-certificaat), niet draaiend, middenstuk gekarteld' });
  for (const s of [-1, 1]) b.contour('Kraag axle', [s * 660, 0, zc], Y, Z, 15, cirkelPunten(0, 0, 60, 24), { banden: 6, opm: 'kraag Ø120 x 15, rondom gelast (de axle ligt erop: de greep vrij van de vloer)' });
  b.reken('Axle (schijven op de uiteinden, gedragen in het midden)', st, 'ligger', 1310, 0, { g: G, proef: 'intrinsiek' });
  b.last('Schijven', G, [0, 0, 225], { geval: 'vol' });
}
/** laadpaal: basisplaat met een rechte laadpen en een afneembare T-greep (stift Ø25 in de laadpen, borgveer): de
 *  schijven gaan er van boven op zodra de greep eraf is (P1-06) */
export function laadpaal(b, def, c) {
  const G = def.maxLast?.[b.V.id] ?? 120, tb = pro(b) ? 12 : 10, Lp = 380;
  b.contour('Basisplaat', [0, 0, 8 + tb / 2], X, Y, tb, [[-200, -200, 50], [200, -200, 50], [200, 200, 50], [-200, 200, 50]], { banden: 8, opm: `basisplaat ${tb} mm, ronde hoeken R50` });
  b.koop('rubbermat', 1, [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => balk([sx * 150, sy * 150, 0], [sx * 150, sy * 150, 8], X, 60, 60, true, 'rubber')), { naam: 'Rubberpads onder de basisplaat', oppervlak: 0.015 });
  const pn = laadpen(b, [0, 0, 8 + tb], Z, Lp);
  const zt = 8 + tb + 10 + Lp;
  b.groep('T-greep (los)');
  const stift = b.staaf('Greepstift', 'r25', [0, 0, zt - 80], [0, 0, zt + 110], { in: pn.id, kap: false, opm: 'rond Ø25 S355, 80 mm in de laadpen gestoken, dwarsgat Ø8 voor de borgveer: de greep gaat eraf om te laden' });
  const tg = b.staaf('Greep', 'greep', [-150, 0, zt + 126], [150, 0, zt + 126], { opm: 'T-greep: buis Ø32 gekarteld, op de stift gelast' });
  stift.los = true; tg.los = true;
  b.koop('borgveer', 1, [], { naam: 'Borgveer (lynch-pin Ø8) voor de T-greep' });
  b.groep('frame');
  b.reken('Laadpen (trekkracht aan de greep)', pn, 'uitkrager', Lp, 0, { g: Math.round(G / 2), proef: 'intrinsiek', las: true });
  b.last('Schijven', G, [0, 0, 200], { geval: 'vol' });
}
/** stenenplatform (atlas stones, P1-08): frame in koker 80 x 80 x 4, deksel 8 mm met een rubbermat 20 mm, zijpanelen,
 *  voetafdruk 1000 x 1000; belastinggeval steen 200 kg op 100 mm van de rand met 30 % horizontaal */
export function stenenPlatform(b, def, c) {
  const P = b.P('k80x80x4'), a = P.b, [B, H] = [mt(b, c.B ?? 1000, [-100, 100]), mt(b, c.H ?? 1150, [-150, 100])], td = 8, zt = H - td, G = def.maxLast?.[b.V.id] ?? 200;
  const xs = [-B / 2 + a / 2, B / 2 - a / 2];
  for (const x of xs) for (const y of xs) staander(b, 'Hoekpaal', 'k80x80x4', x, y, 0, zt);
  for (const z of [a / 2 + 0, zt - a / 2]) {
    for (const y of xs) b.staaf(z < 200 ? 'Onderrand' : 'Bovenrand', 'k80x80x4', [xs[0] + a / 2, y, z], [xs[1] - a / 2, y, z]);
    for (const x of xs) b.staaf(z < 200 ? 'Onderrand' : 'Bovenrand', 'k80x80x4', [x, xs[0] + a / 2, z], [x, xs[1] - a / 2, z]);
  }
  const ml = b.staaf('Middenligger', 'k80x80x4', [xs[0] + a / 2, 0, zt - a / 2], [xs[1] - a / 2, 0, zt - a / 2], { opm: 'midden onder het deksel' });
  b.contour('Deksel', [0, 0, zt + td / 2], X, Y, td, [[-B / 2, -B / 2, 20], [B / 2, -B / 2, 20], [B / 2, B / 2, 20], [-B / 2, B / 2, 20]], { banden: 8, opm: `deksel ${td} mm met ronde hoeken R20, op het frame gelast; rubbermat 20 mm erop` });
  for (const sy of [-1, 1]) b.contour('Zijpaneel', [0, sy * (B / 2 + 1), 0], X, Z, 2, [[-B / 2, a], [B / 2, a], [B / 2, zt - a], [-B / 2, zt - a]], { banden: 1, opm: 'paneel 2 mm tussen onder- en bovenrand gelast' });
  for (const sx of [-1, 1]) b.contour('Zijpaneel', [sx * (B / 2 + 1), 0, 0], Y, Z, 2, [[-B / 2, a], [B / 2, a], [B / 2, zt - a], [-B / 2, zt - a]], { banden: 1, opm: 'paneel 2 mm tussen onder- en bovenrand gelast' });
  b.koop('rubbermat', 1, [balk([-B / 2 + 10, 0, H + 10], [B / 2 - 10, 0, H + 10], Y, B - 20, 20, false, 'rubber')], { naam: 'Rubbermat 20 mm op het deksel (de steen stuitert niet weg)', oppervlak: ((B - 20) ** 2) / 1e6 });
  b.koop('rubbermat', 1, xs.flatMap((y) => [balk([xs[0], y, -0.1], [xs[1], y, -0.1], X, 60, 0.2, false, 'rubber')]), { naam: 'Rubberstroken onder de onderrand', oppervlak: 0.12 });
  b.reken('Middenligger (steen valt erop, x 2)', ml, 'ligger', B - 2 * a, 0, { g: 2 * G, proef: 'intrinsiek' });
  const m = (4 * zt + 9 * (B - 2 * a)) * P.kgm / 1000 + B * B * td * 7.85e-6 + 4 * B * (zt - 2 * a) * 2 * 7.85e-6;
  {
    const F = 2 * G * 9.81, Lp = (B - 2 * a) / 2 - a / 2, M = (F * Lp) / 4, W = (200 * td ** 2) / 6, s = M / W;
    b.toets('Sterkte', `Deksel ${td} mm tussen de liggers (steen valt erop, x 2)`, `F = 2 · ${G} kg · g = ${(F / 1000).toFixed(2).replace('.', ',')} kN, strook 200 mm (AANNAME, de rubbermat spreidt), overspanning ${Math.round(Lp)} mm: M = F·L/4 = ${Math.round(M / 1000)} Nm; σ = ${Math.round(s)} N/mm² ≤ 235`, s / 235, 'EN 1993-1-1 §6.2.5 (plaatstrook)');
    const Mk = 1.5 * 0.3 * G * 9.81 * H / 1000, Mt = (m * 9.81 * (B / 2) + G * 9.81 * 100) / 1000;
    b.toets('Stabiliteit', 'Steen op 100 mm van de rand, 30 % horizontaal (x 1,5)', `kantelmoment 1,5 · 0,3 · ${G} kg · g · ${H} mm = ${Math.round(Mk)} Nm; tegenmoment platform ${Math.round(m)} kg op ${B / 2} mm + steen op 100 mm = ${Math.round(Mt)} Nm`, Mk / Mt, 'AANNAME: belastinggeval steen op de rand (Fable 5.2 P1-08)');
  }
  b.o.platform = { massa: Math.round(m), B, H };
  b.trekLast('Steen rolt over de rand', 0.3 * G * 9.81, [0, -B / 2 + 100, H], [0, -1, 0]);
  b.last('Steen op de rand', G, [0, -B / 2 + 100, H + 150], { geval: 'steen' });
}

// ------------------------------------------------------------------ buiten (EN 16630)
/** ronde paal in een betonpoer (context): 500 mm ingegoten, poer 400 x 400 x 600 met de bovenkant 300 mm onder maaiveld */
/** ronde paal Ø114,3 (pro) of Ø88,9 (thuis) x 4, 600 mm ingegoten in een poer 500 x 500 x 800 met de bovenkant 200 mm
 *  onder het maaiveld (afgeschuinde kop, EN 1176-1 §4.2.14, AANNAME dat EN 16630 hiernaar verwijst); PE-manchet op de
 *  grondlijn; 2 ontluchtingsgaten Ø12 voor het verzinken (EN ISO 14713-2), kopdop na het verzinken (P1-09, P1-10, P2-14) */
export const POER = { b: 500, h: 800, top: -200, in: 600 };
function paal(b, naam, x, y, H) {
  const D = pro(b) ? 114.3 : 88.9, z0 = POER.top - POER.in, L = H - z0;
  const p = b.staaf(naam, pro(b) ? 'b114x4' : 'b89x4', [x, y, z0], [x, y, H], { gaten: [{ s: 40, d: 12, as: 'v' }, { s: L - 40, d: 12, as: 'w' }], opm: `buis Ø${String(D).replace('.', ',')} x 4, ${POER.in} mm ingegoten in een poer C25/30 ${POER.b} x ${POER.b} x ${POER.h} (bovenkant ${-POER.top} mm onder maaiveld, afgeschuind); PE-manchet 300 mm op de grondlijn; 2 ontluchtingsgaten Ø12 (diagonaal, 40 mm van de uiteinden); bolle aluminium kopkap na het verzinken` });
  b.o.context.push(balk([x, y, POER.top - POER.h], [x, y, POER.top], X, POER.b, POER.b, false, 'beton'));
  // P3-10 v6: bolle kopkap (gegoten aluminium) na het verzinken
  b.o.pronk = b.o.pronk ?? []; b.o.pronk.push(balk([x, y, H], [x, y, H + 12], X, D + 4, D + 4, true, 'eindkap'), balk([x, y, H + 12], [x, y, H + 22], X, D - 24, D - 24, true, 'eindkap'));
  b.koop('kopkap', 1, [], { naam: 'Kopkap bol (gegoten aluminium) op de paal', groep: 'afwerking' });
  return p;
}
const rP = (b) => (pro(b) ? 114.3 : 88.9) / 2;
/** horizontale stang tussen twee palen (langs x of y), van wand tot wand */
/** stangen en sporten: pro in RVS 1.4404 (geen coating die van de handen slijt, P3-10 v6), thuis S355 verzinkt */
const rvs = (b, rol) => (pro(b) ? ({ optrek: 'r35rvs', r40: 'r40rvs' }[rol] ?? rol) : rol);
function tussen(b, naam, rol0, A, B, z, opt = {}) {
  const rol = rvs(b, rol0), u = norm(sub([B[0], B[1], 0], [A[0], A[1], 0])), r = rP(b);
  return b.staaf(naam, rol, [A[0] + u[0] * r, A[1] + u[1] * r, z], [B[0] - u[0] * r, B[1] - u[1] * r, z], { kap: false, opm: 'door de paal gestoken en rondom gelast (duplex: verzinkt + poedercoat)', ...opt });
}

/**
 * buitenstation: c = {
 *   palen: [[x, y, H], ...], stangen: [{ p: [i, j], z, naam, rol }], wandrek: { p: [i, j], z0, z1, stap },
 *   ladder: { p: [i, j, k, l] (2 palen links, 2 rechts), z0, z1 (hoogte begin en einde), stap }, bank: {...}, opstap: [[x, y, z], ...] }
 * Elk station krijgt de EN 16630-toetsen (greep, openingen, valhoogte, valruimte) en een infobord.
 */
export function park(b, def, c) {
  const P = c.palen.map(([x, y, H], i) => ({ x, y, H, d: null, i }));
  for (const p of P) { b.groep(`Paal ${p.i + 1}`); p.d = paal(b, 'Paal', p.x, p.y, p.H); }
  b.groep('frame');
  const grepen = [], open = [], o = b.o;
  let hang = 0, sta = 0, klim = 0;
  // stangen tussen 2 palen (optrek, dip, brug, push-up, rows)
  for (const s of c.stangen ?? []) {
    const A = P[s.p[0]], B = P[s.p[1]], z = Math.min(s.z, Math.min(A.H, B.H) - 60);
    const d = tussen(b, s.naam ?? 'Optrekstang', s.rol ?? 'optrek', [A.x, A.y], [B.x, B.y], z);
    grepen.push(d);
    if (/Optrek|Rekstok/.test(s.naam ?? 'Optrekstang')) hang = Math.max(hang, z);
    else sta = Math.max(sta, /Dip|Brug/.test(s.naam ?? '') ? z - 1000 : 0);
    b.reken(`${s.naam ?? 'Optrekstang'} (gebruiker, puntlast in het midden)`, d, 'ligger', d.L, b.V.gebruiker, { proef: 'intrinsiek' });
  }
  // wandrek: sporten tussen 2 palen
  if (c.wandrek) {
    const w = c.wandrek, A = P[w.p[0]], B = P[w.p[1]], z1 = Math.min(w.z1, Math.min(A.H, B.H) - 80);
    b.groep('Wandrek');
    let vorige = null;
    for (let z = w.z0; z <= z1 + 0.1; z += w.stap) { tussen(b, 'Sport wandrek', 'optrek', [A.x, A.y], [B.x, B.y], z); vorige = z; klim = Math.max(klim, z - w.stap); }
    b.groep('frame');
    b.reken('Sport wandrek (gebruiker staat erop)', o.delen.find((d) => d.naam === 'Sport wandrek'), 'ligger', len(sub(B.d.a, A.d.a)) - 2 * rP(b), b.V.gebruiker, { proef: 'intrinsiek' });
  }
  // ladder (monkey bars of schuin): 2 liggers langs de palen, sporten ertussen
  if (c.ladder) {
    const l = c.ladder, [A, Bp, C, D] = l.p.map((i) => P[i]), Pl = b.P('ligger'), r = rP(b);
    // liggers aan de binnenkant van de palen (de palen staan net buiten de ligger)
    const yL = A.y + Math.sign(C.y - A.y) * (r + Pl.b / 2), yR = C.y - Math.sign(C.y - A.y) * (r + Pl.b / 2);
    b.groep('Ladder');
    const zA = l.z0, zB = l.z1, xa = Math.min(A.x, Bp.x) - r, xb = Math.max(A.x, Bp.x) + r;
    const r1 = b.staaf('Ladderligger', 'ligger', [xa, yL, zA], [xb, yL, zB], { opm: 'koker, tegen de palen gelast; eindkap' });
    b.staaf('Ladderligger', 'ligger', [xa, yR, zA], [xb, yR, zB], { opm: 'koker, tegen de palen gelast; eindkap' });
    const Ls = len(sub([xb, 0, zB], [xa, 0, zA])), n = Math.floor((Ls - 2 * 150) / l.stap) + 1, s0 = (Ls - (n - 1) * l.stap) / 2;
    for (let k = 0; k < n; k++) {
      const t = (s0 + k * l.stap) / Ls, x = xa + (xb - xa) * t, z = zA + (zB - zA) * t;
      b.staaf('Sport ladder', rvs(b, 'optrek'), [x, yL + Pl.b / 2, z], [x, yR - Pl.b / 2, z], { kap: false, opm: 'door de liggers gestoken en gelast' });
    }
    hang = Math.max(hang, Math.max(zA, zB));
    b.groep('frame');
    b.reken('Ladderligger (2 gebruikers)', r1, 'ligger', Ls, b.V.gebruiker, { proef: 'intrinsiek' });
    b.reken('Sport ladder (gebruiker hangt eraan)', o.delen.find((d) => d.naam === 'Sport ladder'), 'ligger', Math.abs(yR - yL) - Pl.b, b.V.gebruiker, { proef: 'intrinsiek' });
  }
  // bank (buikspieren schuin): 2 gebogen buizen in de grond, een geperforeerd ligvlak erop, voetrol aan de hoge kant
  if (c.bank) {
    const k = c.bank, Pb = b.P(pro(b) ? 'b76x4' : 'b60x3'), rb = Pb.b / 2, zl = k.zl, zh = k.zh, yl = -k.L / 2, yh = k.L / 2;
    b.groep('Bank');
    for (const sx of [-1, 1]) b.buis('Bankboog', pro(b) ? 'b76x4' : 'b60x3', [[sx * 170, yl, POER.top - POER.in], [sx * 170, yl, zl], [sx * 170, yh, zh], [sx * 170, yh, POER.top - POER.in]], { vlak: X, gaten: [{ s: 40, d: 10, as: 'v' }, { s: 60, d: 10, as: 'w' }], R: Math.ceil(3 * Pb.b + 2), kap: false, opm: `buis gebogen (2 bochten R${Math.ceil(3 * Pb.b + 2)}), 600 mm ingegoten in de poer; 2 ontluchtingsgaten Ø10 aan elk uiteinde` });
    for (const bb of o.delen.filter((d) => d.naam === 'Bankboog')) bb.gaten.push({ s: Math.round(bb.L - 40), d: 10, as: 'v', door: 2 }, { s: Math.round(bb.L - 60), d: 10, as: 'w', door: 2 });
    for (const [y] of [[yl], [yh]]) b.o.context.push(balk([0, y, POER.top - POER.h], [0, y, POER.top], X, 600, POER.b, false, 'beton'));
    const th = Math.atan2(zh - zl, yh - yl), e1 = [0, Math.cos(th), Math.sin(th)], n = [0, -Math.sin(th), Math.cos(th)], m = [0, (yl + yh) / 2, (zl + zh) / 2];
    const Lb = Math.hypot(yh - yl, zh - zl) - 2 * 220, t = 5, o3 = add(m, mul(n, rb + t / 2 + 0.3));
    const sleuven = Array.from({ length: 6 }, (_, i) => -Lb / 2 + 120 + i * ((Lb - 240) / 5)).map((s) => [[-110, s - 3, 2.9], [110, s - 3, 2.9], [110, s + 3, 2.9], [-110, s + 3, 2.9]]); // sleuven 6 mm: buiten de vingermaat 8-25 (P2-12)
    b.contour('Ligvlak', o3, X, e1, t, [[-200, -Lb / 2, 40], [200, -Lb / 2, 40], [200, Lb / 2, 40], [-200, Lb / 2, 40]], { uitsparingen: sleuven, banden: 6, opm: `ligvlak ${t} mm met afwateringssleuven 6 mm, hoeken R40, randen gebroken (r ≥ 2,5); op de bogen gelast` });
    // voetrol aan de hoge kant, onder het ligvlak: vrije opening > 230 mm
    const zr = zh - 300;
    b.staaf('Voetsteun', 'greep', [-170 + rb, yh - 10, zr], [170 - rb, yh - 10, zr], { kap: false, gaten: [{ s: 20, d: 8, as: 'v' }, { s: 340 - 2 * rb - 20, d: 8, as: 'w' }], opm: 'buis Ø32 tussen de bogen gelast, schuimrol erover (buitenkwaliteit EPDM)' });
    b.koop(b.V.schuimrol, 1, [balk([-130, yh - 10, zr], [130, yh - 10, zr], X, 100, 100, true, 'rubber')], { naam: 'Voetrol EPDM Ø100 op de voetsteun' });
    open.push({ wat: 'voetrol - ligvlak', g: Math.round(zh + rb - (zr + 50)) });
    sta = Math.max(sta, zh);
    // P3-10 v6: het infobord als gelaserd RVS-plaatje op het achterste been van de bank (geen aparte infopaal)
    b.o.pronk = b.o.pronk ?? []; b.o.pronk.push(balk([170 + rb + 0.6, yh, 500], [170 + rb + 0.6, yh, 800], [0, 1, 0], 200, 1, false, 'instructie'));
    b.groep('frame');
    b.reken('Bankboog (gebruiker op het ligvlak)', o.delen.find((d) => d.naam === 'Bankboog'), 'ligger', Math.hypot(yh - yl, zh - zl), b.V.gebruiker / 2, { proef: 'intrinsiek' });
  }
  // opstapblokken: plaat op 2 palen
  for (const [k, [x, y, z]] of (c.opstap ?? []).entries()) {
    b.groep(`Opstap ${k + 1}`);
    const r = rP(b), pa = [x - 200, x + 200].map((xx) => paal(b, 'Opstappaal', xx, y, z));
    b.contour('Opstap', [x, y, z + 4], X, Y, 8, [[-250, -200, 40], [250, -200, 40], [250, 200, 40], [-250, 200, 40]], { banden: 8, opm: 'opstap 8 mm traanplaat-antislip, ronde hoeken R40, op de palen gelast' });
    sta = Math.max(sta, z + 8); void r;
    b.reken(`Opstappaal (gebruiker springt, x 2 op 2 palen)`, pa[0], 'staander', z + 500, b.V.gebruiker, { proef: 'intrinsiek' });
    b.groep('frame');
  }
  // openingen tussen evenwijdige stangen, sporten en liggers die naast elkaar liggen (in het vlak loodrecht op de as)
  const kand = o.delen.filter((d) => d.soort === 'staaf' && !d.pad && /optrek|sport|ligger|brug|dip|push|rekstok|stang|paal|voetsteun/i.test(d.naam)); // P2-12 v6: ook palen en ladderliggers
  for (let i = 0; i < kand.length; i++) for (let j = i + 1; j < kand.length; j++) {
    const p = kand[i], q = kand[j], u = p.u;
    if (Math.abs(u[0] * q.u[0] + u[1] * q.u[1] + u[2] * q.u[2]) < 0.99) continue;
    const pr = (v) => v[0] * u[0] + v[1] * u[1] + v[2] * u[2], [p0, p1] = [pr(p.a), pr(p.b)].sort((x, y) => x - y), [q0, q1] = [pr(q.a), pr(q.b)].sort((x, y) => x - y);
    if (Math.min(p1, q1) - Math.max(p0, q0) < 100) continue;
    const dv = sub(q.a, p.a), w = sub(dv, mul(u, pr(dv))), g = len(w) - Math.max(p.P.b, p.P.h) / 2 - Math.max(q.P.b, q.P.h) / 2;
    if (g < 600) open.push({ wat: `${p.naam.toLowerCase()} / ${q.naam.toLowerCase()}`, g });
  }
  en16630(b, { hang, sta, klim, open, klimHang: c.klim ?? hang >= 2000 });
}

/** EN 16630: greepdiameter, openingen (hoofd/nek 89-230 mm), vrije valhoogte, valruimte en ondergrond, infobord */
export function en16630(b, { hang = 0, sta = 0, klim = 0, open = [], klimHang = false }) {
  const o = b.o, gr = o.delen.filter((d) => d.soort === 'staaf' && /Optrek|Sport|Rekstok|Dip|Brug|Push/.test(d.naam));
  o.buiten = true; o.verzinkt = true; o.grond = true; o.verankerd = 'grond';
  const Ds = [...new Set(gr.map((d) => Math.round(d.P.b)))];
  if (Ds.length) b.toets('EN 16630', 'Greepdiameter', `stangen en sporten Ø ${Ds.join(' / ')} mm; omvatten met de hand: Ø 16-45 mm`, Math.max(...Ds.map((x) => (x > 45 ? x / 45 : 16 / x))), `${BRON16630}; EN 1176-1 §4.2.4.3 (AANNAME: zelfde grens)`);
  const fout = open.filter((x) => x.g > 89 && x.g < 230);
  const lijst = [...new Map(open.map((x) => [`${x.wat} ${Math.round(x.g)}`, x])).values()].map((x) => `${x.wat}: ${Math.round(x.g)} mm`).slice(0, 8).join('; ');
  if (open.length) b.toets('EN 16630', 'Openingen hoofd en nek (geen vrije opening tussen 89 en 230 mm)', `${lijst}${fout.length ? ` — FOUT: ${fout.length} opening(en) tussen 89 en 230 mm` : ' — alle openingen < 89 of > 230 mm'}`, fout.length ? 1.5 : 0.6, `${BRON16630}; EN 1176-1 §4.2.7 (proefstuk C en D)`);
  // vingeropeningen 8-25 mm (P2-12 v6): tussen evenwijdige delen
  const vinger = open.filter((x) => x.g > 8 && x.g < 25);
  if (open.length) b.toets('EN 16630', 'Vingeropeningen (geen opening tussen 8 en 25 mm)', vinger.length ? `FOUT: ${vinger.map((x) => `${x.wat}: ${Math.round(x.g)} mm`).slice(0, 4).join('; ')}` : 'geen vrije opening tussen 8 en 25 mm tussen stangen, sporten, liggers en palen; afwateringssleuven 6 mm', vinger.length ? 1.5 : 0.5, `${BRON16630}; sunshinegym.co.uk (8-25 mm), AANNAME`);
  // vrije valhoogte: hangen = greep min 1 m (armlengte), maar zonder aftrek als je op de stang kunt klimmen of zitten
  // (muscle-up, monkey bars: P2-11 v6), klimmen = hoogste voetsteun, staan = staanvlak
  const Yv = Math.max(hang ? hang - (klimHang ? 0 : 1000) : 0, klim, sta, 0), X0 = Math.max(1500, (2 / 3) * Yv + 500);
  o.valruimte = { Y: Math.round(Yv), X: Math.round(X0), klim: klimHang };
  b.toets('EN 16630', 'Vrije valhoogte ≤ 3 m', `hangen: greep ${Math.round(hang)}${klimHang ? ' (klimzone: muscle-up en op de stang zitten mogelijk, geen aftrek)' : ' − 1000 mm armlengte'}; klimmen: hoogste voetsteun ${Math.round(klim)} mm; staan: ${Math.round(sta)} mm → Y = ${Math.round(Yv)} mm ≤ 3000`, Yv / 3000, BRON16630);
  const tegels = (o.opties?.opties ?? []).includes('valtegels');
  b.toets('EN 16630', 'Valruimte en ondergrond', `valruimte X = max(1,5 m; 2/3·Y + 0,5 m) = ${(X0 / 1000).toFixed(2).replace('.', ',')} m rondom; ${Yv > 1000 ? `Y > 1 m: valdempende ondergrond verplicht (${tegels ? 'optie rubbertegels EN 1177 gekozen' : 'gras volstaat niet: zand/grind 300 mm of rubbertegels EN 1177 (optie)'})` : 'Y ≤ 1 m: gras of een harde vlakke ondergrond volstaat'}`, Yv > 1000 && !tegels ? 0.9 : 0.5, `${BRON16630}: X = 2/3·Y + 0,5, min. 1,5 m; valdempend boven 1 m`);
  o.valruimte.X = Math.round(X0);
  // valruimte als context: een dun vlak rond de voetafdruk van het station
  const box = o.delen.reduce((acc, d) => { for (const g of d.geo) { const [mn, mx] = aabb(g); for (let i = 0; i < 2; i++) { acc[0][i] = Math.min(acc[0][i], mn[i]); acc[1][i] = Math.max(acc[1][i], mx[i]); } } return acc; }, [[Infinity, Infinity], [-Infinity, -Infinity]]);
  const xm = (box[0][0] + box[1][0]) / 2, w = box[1][0] - box[0][0] + 2 * X0, dd = box[1][1] - box[0][1] + 2 * X0, ym = (box[0][1] + box[1][1]) / 2;
  if (!tegels) o.context.push(balk([xm - w / 2, ym, 0.6], [xm + w / 2, ym, 0.6], Y, dd, 1.2, false, 'valzone'));
  b.koop('infobord', 1, [], { naam: 'Infobord EN 16630 (oefeningen, gebruikersleeftijd ≥ 14 jaar / 1,40 m, noodnummer, beheerder)', groep: 'afwerking' });
  b.koop('beton', o.context.filter((g) => g.kleur === 'beton').length, [], { naam: `Betonpoer C25/30 ${POER.b} x ${POER.b} x ${POER.h} (uitzetten, graven, storten; zie het funderingsplan)`, groep: 'afwerking' });
}

// ------------------------------------------------------------------ de catalogus
const MO = (t, p, bt, bp) => ({ thuis: t, pro: p, bronT: bt, bronP: bp });
const F = (id, naam, kort, uitleg, spieren, oef, maxLast, markt, cfg, bouw, maten = bouw === park ? ['standaard'] : MATEN) => ({ id, soort: 'buiten', naam, kort, uitleg, spieren, oefeningen: oef, maxLast, markt, maten, cfg, ral: bouw === park ? undefined : '9005', optiesSoort: bouw === park ? 'park' : 'strongman', reeks: bouw === park ? 'buiten (EN 16630)' : 'strongman', bouw(b) { bouw(b, this, this.cfg); } });
void 0;
const KP = 'Kompan / Lappset / BarBarian buitenfitness';
// palen op een rij langs x, met hoogtes
const rij = (xs, H, y = 0) => xs.map((x, i) => [x, y, Array.isArray(H) ? H[i] : H]);
export const BUITEN = [
  F('FX-01', 'Juk (yoke)', 'Strongman-juk 1,5 m met nekkussen en laadpennen.', 'Twee staanders op voetbalken met Hardox-sleepstrips en schetsplaten, een verstelbare jukbalk (2 pennen Ø25, per 50 mm) met nekkussen, een dwarsligger achteraan en een laadpen Ø48 x 450 aan elke kant.', 'benen, rug, core', ['yoke carry', 'yoke squat'], { thuis: 250, pro: 450 }, MO([300, 650], [900, 1800], 'Gorilla / ATX yoke ± € 300-650', 'Rogue / Eleiko yoke ± € 900-1800'), { H: 1500, W: 1150 }, juk),
  F('FX-02', 'Juk hoog', 'Hoog juk 1,8 m voor lange lifters en zware lasten.', 'Zoals het juk, maar 1,8 m hoog en 1,25 m breed; jukbalk verstelbaar per 50 mm.', 'benen, rug, core', ['yoke carry', 'yoke squat'], { thuis: 300, pro: 500 }, MO([400, 800], [1200, 2200], 'ATX yoke hoog ± € 400-800', 'Rogue Monster yoke ± € 1200-2200'), { H: 1800, W: 1250 }, juk),
  F('FX-03', 'Farmers walk (paar)', 'Twee farmers-handvatten met laadpennen.', 'Per handvat een hoofdbuis met laadpennen aan beide kanten, een verhoogde gekartelde greep tussen twee gelaserde platen en standpoten met rubber.', 'grip, trapezius, core', ['farmers walk'], { thuis: 200, pro: 300 }, MO([150, 350], [400, 900], 'Gorilla / ATX farmers handles ± € 150-350', 'Rogue farmers handles ± € 400-900'), {}, farmers),
  F('FX-04', 'Laadpaal met greep', 'Laadpaal op een basisplaat met trekgreep.', 'Gelaserde basisplaat met rubberpads, laadpen Ø48 met een afneembare T-greep (stift Ø25 met borgveer): greep eraf, schijven erop, greep erin.', 'rug, grip', ['loading pin deadlift', 'rows'], { thuis: 120, pro: 200 }, MO([60, 150], [150, 350], 'loading pin ± € 60-150', 'Rogue loading pin ± € 150-350'), {}, laadpaal, []),
  F('FX-05', 'Frame carry', 'Draagframe 1,7 m met verhoogde grepen en 4 laadpennen.', 'Twee langsbalken met eindplaten, dwarsliggers, grepen op 650 mm tussen paaltjes en vier rechte laadpennen.', 'benen, rug, grip', ['frame carry'], { thuis: 300, pro: 500 }, MO([250, 500], [600, 1200], 'ATX frame carry ± € 250-500', 'Rogue frame carry ± € 600-1200'), { L: 1700, zg: 650 }, frameCarry),
  F('FX-06', 'Deadlift-frame', 'Laag deadlift-frame (car deadlift) met dikke grepen.', 'Zoals de frame carry maar met grepen op 450 mm en dikke grepen Ø48 voor grip-training.', 'rug, benen, grip', ['frame deadlift'], { thuis: 300, pro: 500 }, MO([300, 600], [700, 1500], 'deadlift frame ± € 300-600', 'Rogue / Eleiko deadlift frame ± € 700-1500'), { L: 1800, zg: 450, dik: true }, frameCarry),
  F('FX-07', 'Slee duwen en trekken', 'Prowler: slee met duwpalen, laadpen en trekoog.', 'Twee gebogen glijders, bodemplaat, laadpen, twee duwpalen met een hoge en een lage greep en een trekoog achteraan.', 'benen, conditie', ['sled push', 'sled pull'], { thuis: 150, pro: 250 }, MO([250, 500], [600, 1500], 'Gorilla / ATX prowler ± € 250-500', 'Rogue / Torque sled ± € 600-1500'), { duw: true }, slee, ['standaard']),
  F('FX-08', 'Slee trekken', 'Lage trekslee met laadpen en trekoog.', 'Twee gebogen glijders, bodemplaat, laadpen en een trekoog voor het trektuig.', 'benen, conditie', ['sled pull', 'sled drag'], { thuis: 150, pro: 250 }, MO([150, 350], [400, 900], 'ATX zugschlitten ± € 150-350', 'Rogue sled ± € 400-900'), { duw: false }, slee, ['standaard']),
  F('FX-09', 'Log Ø273', 'Strongman-log 1,2 m met neutrale grepen en laadpennen (leeg ± 35-50 kg).', 'Romp in buis Ø273 x 4 (thuis Ø219 x 3) met kopplaten, twee neutrale grepen in gelaserde uitsparingen en een laadpen van 400 mm aan elke kop.', 'schouders, triceps, benen', ['log press', 'log clean'], { thuis: 100, pro: 150 }, MO([300, 600], [700, 1500], 'ATX log ± € 300-600', 'Rogue log ± € 700-1500'), {}, log),
  F('FX-10', 'Axle Ø50', 'Dikke, niet-draaiende stang van 2,13 m.', 'Buis Ø48,3 x 8 in S355 met twee kragen: dikke greep voor deadlift, clean en press.', 'grip, rug, schouders', ['axle deadlift', 'axle press'], { thuis: 200, pro: 250 }, MO([150, 300], [300, 600], 'Gorilla / ATX axle ± € 150-300', 'Rogue axle ± € 300-600'), {}, axle, []),
  F('FX-11', 'Stenenplatform', 'Platform 1,15 m hoog voor atlas stones, 1 x 1 m.', 'Frame in koker 80 x 80 x 4 met zijpanelen, deksel 8 mm met een rubbermat van 20 mm; zwaar genoeg (± 200 kg) om een steen op de rand te nemen.', 'rug, benen', ['atlas stone load'], { thuis: 150, pro: 200 }, MO([200, 400], [500, 1100], 'stone platform ± € 200-400', 'Rogue stone platform ± € 500-1100'), {}, stenenPlatform),
  F('FX-12', 'Optrekstang buiten', 'Vrijstaande optrekstang op 2,3 m (EN 16630).', 'Twee ronde palen in een betonpoer met een stang Ø35; verzinkt en gecoat, met infobord en valruimte.', 'rug, biceps', ['pull-up', 'chin-up', 'hanging leg raise'], undefined, MO([400, 900], [1200, 2500], 'buiten optrekstang ± € 400-900', `${KP} pull-up ± € 1200-2500`), { palen: rij([-600, 600], 2400), stangen: [{ p: [0, 1], z: 2300 }] }, park),
  F('FX-13', 'Optrekstation 3 hoogtes', 'Vier palen met optrekstangen op 1,9, 2,1 en 2,3 m.', 'Vier palen op een rij met drie stangen op oplopende hoogte: voor elke lengte een stang.', 'rug, biceps', ['pull-up', 'chin-up'], undefined, MO([800, 1600], [2500, 5000], 'buiten optrekstation ± € 800-1600', `${KP} ± € 2500-5000`), { palen: rij([-1650, -550, 550, 1650], [2000, 2200, 2400, 2400]), stangen: [{ p: [0, 1], z: 1900 }, { p: [1, 2], z: 2100 }, { p: [2, 3], z: 2300 }] }, park),
  F('FX-14', 'Brug buiten', 'Parallelle stangen op 1,25 m (EN 16630).', 'Vier palen met twee evenwijdige stangen op 500 mm: dips, L-sits, brugwandelen.', 'borst, triceps, core', ['dips', 'L-sit', 'brugwandelen'], undefined, MO([500, 1000], [1500, 3000], 'buiten brug ± € 500-1000', `${KP} parallel bars ± € 1500-3000`), { palen: [[-700, -250, 1300], [700, -250, 1300], [-700, 250, 1300], [700, 250, 1300]], stangen: [{ p: [0, 1], z: 1250, naam: 'Brugstang', rol: 'r40' }, { p: [2, 3], z: 1250, naam: 'Brugstang', rol: 'r40' }] }, park),
  F('FX-15', 'Dipstation buiten', 'Korte dipstangen op 1,2 m, 520 mm uit elkaar.', 'Vier palen met twee korte stangen voor dips en knee raises.', 'borst, triceps', ['dips', 'knee raise'], undefined, MO([300, 700], [1000, 2200], 'buiten dipstation ± € 300-700', `${KP} dip ± € 1000-2200`), { palen: [[-300, -260, 1250], [300, -260, 1250], [-300, 260, 1250], [300, 260, 1250]], stangen: [{ p: [0, 1], z: 1200, naam: 'Dipstang', rol: 'r40' }, { p: [2, 3], z: 1200, naam: 'Dipstang', rol: 'r40' }] }, park),
  F('FX-16', 'Monkey bars buiten', 'Horizontale ladder 3 m op 2,3 m hoogte.', 'Vier palen, twee liggers en sporten om de 300 mm (vrije opening 265 mm, buiten 89-230 mm).', 'rug, grip, schouders', ['monkey bars', 'hangen'], undefined, MO([900, 1800], [3000, 6000], 'buiten monkey bars ± € 900-1800', `${KP} overhead ladder ± € 3000-6000`), { palen: [[-1500, -350, 2400], [1500, -350, 2400], [-1500, 350, 2400], [1500, 350, 2400]], ladder: { p: [0, 1, 2, 3], z0: 2300, z1: 2300, stap: 300 } }, park),
  F('FX-17', 'Wandrek buiten', 'Klimrek 2,4 m met sporten om de 280 mm.', 'Twee palen met sporten Ø32 om de 280 mm (vrije opening 248 mm): klimmen, stretchen, leg raises.', 'rug, core, mobiliteit', ['klimmen', 'leg raise', 'stretchen'], undefined, MO([500, 1000], [1500, 3000], 'buiten wandrek ± € 500-1000', `${KP} wall bars ± € 1500-3000`), { palen: rij([-450, 450], 2500), wandrek: { p: [0, 1], z0: 300, z1: 2260, stap: 280 } }, park),
  F('FX-18', 'Buikspierbank buiten', 'Schuine buikspierbank met voetrol.', 'Twee gebogen buizen in de grond, een geperforeerd ligvlak onder 20° en een voetrol aan de hoge kant.', 'buik', ['sit-up', 'crunch', 'leg raise'], undefined, MO([400, 800], [1200, 2500], 'buiten buikbank ± € 400-800', `${KP} sit-up bench ± € 1200-2500`), { palen: [], bank: { L: 1500, zl: 350, zh: 900 } }, park, ['standaard']),
  F('FX-19', 'Rekstok 2 hoogtes', 'Drie palen met een lage (rows) en een hoge stang.', 'Een stang op 1,0 m voor australian rows en dips en een stang op 2,3 m voor pull-ups.', 'rug, biceps', ['australian row', 'pull-up'], undefined, MO([500, 1000], [1500, 3000], 'buiten rekstok ± € 500-1000', `${KP} ± € 1500-3000`), { palen: rij([-1150, 0, 1150], [1100, 2400, 2400]), stangen: [{ p: [0, 1], z: 1000, naam: 'Rekstok laag' }, { p: [1, 2], z: 2300, naam: 'Rekstok' }] }, park),
  F('FX-20', 'Push-up stangen', 'Twee lage stangen op 350 en 500 mm.', 'Drie korte palen met twee lage stangen: push-ups, incline push-ups en dips met de voeten op de grond.', 'borst, triceps', ['push-up', 'incline push-up'], undefined, MO([300, 600], [900, 1800], 'buiten push-up ± € 300-600', `${KP} push-up bars ± € 900-1800`), { palen: rij([-900, 0, 900], [450, 600, 600]), stangen: [{ p: [0, 1], z: 350, naam: 'Push-upstang' }, { p: [1, 2], z: 500, naam: 'Push-upstang' }] }, park),
  F('FX-21', 'Schuine ladder', 'Ladder van 1,4 naar 2,3 m: klimmen en hangend omhoog.', 'Vier palen, twee schuine liggers en sporten om de 300 mm.', 'rug, grip, schouders', ['ladder klimmen', 'hangen'], undefined, MO([700, 1400], [2200, 4500], 'buiten schuine ladder ± € 700-1400', `${KP} incline ladder ± € 2200-4500`), { palen: [[-1300, -350, 1500], [1300, -350, 2400], [-1300, 350, 1500], [1300, 350, 2400]], ladder: { p: [0, 1, 2, 3], z0: 1400, z1: 2300, stap: 300 } }, park),
  F('FX-22', 'Combinatie optrek + brug', 'Optrekstang, brug en dip in één station.', 'Vijf palen: een optrekstang op 2,3 m, een brug op 1,25 m en een lage stang op 1,0 m.', 'rug, borst, triceps', ['pull-up', 'dips', 'australian row'], undefined, MO([1200, 2500], [4000, 8000], 'buiten combistation ± € 1200-2500', `${KP} combi ± € 4000-8000`), { palen: [[-1600, 0, 2400], [-400, 0, 2400], [400, -250, 1300], [1600, -250, 1300], [400, 250, 1300], [1600, 250, 1300]], stangen: [{ p: [0, 1], z: 2300 }, { p: [2, 3], z: 1250, naam: 'Brugstang', rol: 'r40' }, { p: [4, 5], z: 1250, naam: 'Brugstang', rol: 'r40' }] }, park),
  F('FX-23', 'Calisthenics rig 2 vakken', 'Rig met optrekstangen en monkey bars.', 'Zes palen: twee optrekstangen op 2,3 m vooraan, monkey bars over 2,4 m erachter.', 'rug, schouders, grip', ['pull-up', 'monkey bars', 'toes to bar'], undefined, MO([2000, 4000], [6000, 12000], 'buiten rig ± € 2000-4000', `${KP} street workout rig ± € 6000-12000`), { palen: [[-1200, -350, 2400], [0, -350, 2400], [1200, -350, 2400], [-1200, 350, 2400], [1200, 350, 2400]], stangen: [{ p: [0, 1], z: 2050 }, { p: [1, 2], z: 2050 }], ladder: { p: [0, 2, 3, 4], z0: 2350, z1: 2350, stap: 300 } }, park),
  F('FX-24', 'Opstapblokken 3 hoogtes', 'Drie opstapplaten op 200, 300 en 400 mm.', 'Elke opstap is een plaat 8 mm met antislip op twee palen in de grond: step-ups, box jumps, incline push-ups.', 'benen, conditie', ['step-up', 'box jump'], undefined, MO([400, 800], [1200, 2400], 'buiten step ± € 400-800', `${KP} step ± € 1200-2400`), { palen: [], opstap: [[-800, 0, 200], [0, 0, 300], [800, 0, 400]] }, park, ['standaard']),
  F('FX-25', 'Combinatie groot', 'Optrek op 2 hoogtes, monkey bars en wandrek.', 'Een groot station: wandrek, twee optrekstangen en monkey bars, met valruimte en infobord.', 'heel het lichaam', ['pull-up', 'monkey bars', 'klimmen'], undefined, MO([2500, 5000], [7000, 14000], 'buiten combistation groot ± € 2500-5000', `${KP} ± € 7000-14000`), { palen: [[-2400, -350, 2500], [-1400, -350, 2400], [1400, -350, 2400], [-1400, 350, 2400], [1400, 350, 2400], [2400, 0, 2400]], wandrek: { p: [0, 1], z0: 300, z1: 2260, stap: 280 }, ladder: { p: [1, 2, 3, 4], z0: 2300, z1: 2300, stap: 300 }, stangen: [{ p: [2, 5], z: 2100 }] }, park),
];
void Y;
