// Selectorized toestellen (FS-01 ..): een eigen gewichtstapel met selectiepen in een volledig omkapte toren, en een
// hefboom op een as in twee lagerhuizen. Op de as zit een nok (trommel R200) die de kabel opwikkelt: de kabel loopt
// van de nok naar een vloerkatrol, onder de toren door en over de bovenkatrol naar de stapel. De gebruiker zit, ligt
// of staat in een station (zitting, rug-, borst-, arm- of ligkussen) en duwt of trekt aan een rol, een greep of een
// kussen op de hefboom. Alles in de pro-vormtaal (ovaalbuis, kappen) van de bestaande kabelmachines. Node en browser.
import { staander, ligger, voetjes, katrolBeugel, X, Y, balk, add, mul, sub, norm } from './bouwstenen.mjs';
import { cirkelPunten } from './vorm.mjs';
import { toren, bovenKatrol, onderKatrol, vloer, zitting, gewicht, isPro } from './kabel.mjs';
import { uitslagStrook } from './vorm.mjs';

const rad = (g) => (g * Math.PI) / 180;
const MATEN = ['compact', 'standaard', 'XL'];

/** grens aan de greep per soort oefening (kg bij de pro-stapel; AANNAME uit merktoestellen Life Fitness/Matrix/Technogym,
 *  zie docs/Normen-en-bronnen.md): thuis 60 %, semi 80 % van pro */
export const NOKGRENS = { druk: 100, trek: 100, rug: 60, been: 90, kuit: 130, arm: 45, romp: 45 };
const FV = { thuis: 0.6, semi: 0.8, pro: 1 };
/** stapel van een nokstation: thuis 20, semi 24, pro 28 platen van 5 kg (pro 140 kg: kabel Ø6 en katrol 3 kN op de grens); compact en XL dezelfde stapel (de grens aan de greep, de kabel en de katrol) */
export const nokStapel = (b) => ({ thuis: 20, semi: 24, pro: 28 }[b.V.id] ?? 20);

/**
 * nokstation: c = { as: [y, z] draaipunt, hoek (graden bij stand 1, teken = draairichting), oef (soort voor de grens),
 *   xo (lagerpalen op ±xo), armen: [{ x, naar: [dy, dz] }], einde: 'rol' | 'greep' | 'dwars' | 'kussen', station, toren }
 * De nok is een segment (cam) met straal Rn = grens · L / stapel (P1-02); de kabel loopt van de raaklijn aan de kant
 * waar de nok opwikkelt naar een vloerkatrol (P1-01: bij een negatieve hoek vóór de as); de stapel stijgt R·θ (P1-03).
 */
export function nokStation(b, def, c) {
  const xl = -230, V = b.V, P = b.P('ligger'), Pb = b.P('bank'), [yk, zk] = c.as;
  const n = nokStapel(b), G = n * V.stapelKg, L = Math.hypot(...c.armen[0].naar), grens = NOKGRENS[c.oef ?? 'druk'] * (FV[V.id] ?? 1);
  const Rmax = Math.min(480, zk - 160), Rn = Math.min(Rmax, Math.max(120, Math.ceil((grens * L * 1.05) / G / 10) * 10));
  const sg = Math.sign(c.hoek) || 1, thMax = rad(Math.min(75, Math.abs(c.hoek))), slag = Math.round(Rn * thMax);
  const T = toren(b, { x0: -155, yt: yk + (c.toren ?? 920), H: Math.max(1800, zk + 420, 60 + 20 * n + slag + 420), ogen: [xl + 155], n, slag }), r = T.r;
  const pa = bovenKatrol(b, T, xl, 'voor', 'A (boven de stapel)'), pd = onderKatrol(b, T, xl, 'B (onderaan)');
  const { vl } = vloer(b, T, 0);
  const xo = c.xo ?? 360, xh = xo - P.b / 2, Pas = b.P('r45');
  for (const sx of [-1, 1]) {
    staander(b, 'Lagerpaal', 'frameO', sx * xo, yk, P.h, zk + 60, { opm: 'vlakovaalbuis' });
    const pv = b.staaf('Voet lagerpaal', 'ligger', [sx * xo, yk - 250, P.h / 2], [sx * xo, yk + 250, P.h / 2]); voetjes(b, pv, 2);
    ligger(b, 'Dwarsvoet lagerpaal', 'ligger', vl, pv, { y: yk, z: P.h / 2 }, { as: 0 });
    b.staaf('Lagerhuis', 'b70x12', [sx * (xh - 60), yk, zk], [sx * xh, yk, zk], { boring: 50, kap: false, opm: 'buis Ø70 x 12 E355 naadloos (binnen Ø46), uitgedraaid Ø50 H7, Ra 1,6, voor 2 flensglijlagers GFM-4550-30 (wand 5 mm); tegen de lagerpaal gelast, na het lassen draaien (P1-04)' });
  }
  b.groep('Hefboom');
  const th = sg * thMax * b.stand, rot = (p) => { const dy = p[1] - yk, dz = p[2] - zk; return [p[0], yk + dy * Math.cos(th) - dz * Math.sin(th), zk + dy * Math.sin(th) + dz * Math.cos(th)]; }, rotD = (d) => sub(rot(add([0, yk, zk], d)), [0, yk, zk]);
  const as = b.staaf('As hefboom', 'r45', [-(xh - 1), yk, zk], [xh - 1, yk, zk], { kap: false, in: 'lagerhuis', opm: `rond Ø${Pas.b} h9 C45, in 2 lagerhuizen; stelringen DIN 705 buiten de huizen` });
  // nok als segment: de raaklijn ligt op hoek a0 (0 = +y, π = -y); het opgewikkelde stuk ligt achter het raakpunt
  const a0 = sg > 0 ? 0 : Math.PI, m0 = a0 + sg * rad(20), m1 = a0 - sg * (thMax + rad(15)), N = 14;
  const boog = Array.from({ length: N + 1 }, (_, i) => m0 + ((m1 - m0) * i) / N).map((m) => [Rn * Math.cos(m + th), Rn * Math.sin(m + th), 0]);
  const dH = 2 * Math.PI - Math.abs(m0 - m1), naaf = [1, 2, 3, 4].map((i) => m1 - (sg * dH * i) / 5).map((m) => [90 * Math.cos(m + th), 90 * Math.sin(m + th), 25]);
  const nokPts = sg > 0 ? [...boog, ...naaf].reverse() : [...boog, ...naaf];
  b.contour(`Nok (R${Rn})`, [xl, yk, zk], Y, [0, 0, 1], 12, nokPts, { in: as.id, banden: 10, gaten: [{ x: 0, y: 0, d: Pas.b }], opm: `nokschijf (segment) R${Rn} x 12, 2 platen + tussenring met kabelgroef, op de as gelast; segment over ${Math.round((thMax * 180) / Math.PI + 35)}°` });
  const rolArm = V.id === 'thuis' ? 'o80x40x3' : 'o100x50x3', Pa0 = b.P(rolArm), xmax = xh - 60 - Pa0.b / 2 - 8; // P3-01 v6: armen in vlakovaal
  const armen = c.armen.map((a0_) => { const a = { ...a0_, x: Math.sign(a0_.x) * Math.min(Math.abs(a0_.x), xmax) || a0_.x }, e = [a.x, yk + a.naar[0], zk + a.naar[1]]; return { a, e, d: b.staaf('Hefboomarm', rolArm, [a.x, yk, zk], rot(e), { v: X }) }; });
  const e0 = armen[0].e;
  // P2-01 v6: naafbus Ø70 x 12 op de as onder elke arm (de arm in een uitsparing rond de bus), rondom gelast
  for (const { a } of armen) b.staaf('Naafbus', 'b70x12', [a.x - 35, yk, zk], [a.x + 35, yk, zk], { in: as.id, kap: false, opm: 'buis Ø70 x 12 E355 op de as gelast (a4 rondom); de hefboomarm in een uitsparing rond de bus gelast' });
  // P2-02 v6: instelschijf met gaten om de 15° naast de rechterarm en een veerpen in de arm: de startstand in stappen
  {
    const ar = armen.reduce((m, x) => (x.a.x > m.a.x ? x : m), armen[0]), xs2 = armen.length > 1 ? ar.a.x - Pa0.b / 2 - 46 : xh - 60 - 15, Rs = 140;
    const sch = b.contour('Instelschijf', [xs2, yk, zk], Y, [0, 0, 1], 10, cirkelPunten(0, 0, Rs, 36), { in: as.id, banden: 8, gaten: [{ x: 0, y: 0, d: Pas.b }, ...Array.from({ length: 6 }, (_, i) => { const t2 = rad(-50 + 20 * i); return { x: 98 * Math.cos(t2), y: 98 * Math.sin(t2), d: V.gat }; })], opm: `instelschijf Ø${2 * Rs} x 10 op de as gelast; 6 gaten Ø${V.gat} om de 20°: startstand van de hefboom met een veerpen in de arm` });
    b.koop(V.pin25, 1, [], { naam: 'Veerpen startstand (in de arm, door de instelschijf)' });
    void sch;
  }
  if (c.einde === 'rol') {
    b.staaf('As rol', 'as', rot([-200, e0[1], e0[2]]), rot([200, e0[1], e0[2]]), { kap: false, in: armen[0].d.id });
    b.koop(V.schuimrol, 2, [-1, 1].map((s2) => balk(rot([s2 * 30, e0[1], e0[2]]), rot([s2 * 180, e0[1], e0[2]]), X, 100, 100, true, 'leer')), { naam: 'Schuimrol Ø100' });
  } else if (c.einde === 'greep') for (const { a, e } of armen) { const s = Math.sign(a.x) || 1; b.staaf('Greep', 'greep', rot([a.x - s * (Pa0.b / 2 - 1), e[1], e[2]]), rot([a.x - s * 170, e[1] + (c.greepSchuin ?? 0), e[2] + (c.greepSchuin ?? 0)]), { opm: 'met rubber handvat; schuin naar binnen (ergonomisch)' }); }
  else if (c.einde === 'dwars') b.staaf('Greep', 'greep', rot([armen[0].a.x + Math.sign(-armen[0].a.x) * (Pa0.b / 2 - 0.5), e0[1], e0[2]]), rot([armen[armen.length - 1].a.x - Math.sign(armen[armen.length - 1].a.x) * (Pa0.b / 2 - 0.5), e0[1], e0[2]]), { opm: 'dwarsgreep tussen de armen, rubber handvat' });
  else if (c.einde === 'kussen') { const nn = norm(rotD(c.kussenN ?? [0, -1, 0])), xa = Math.abs(armen[0].a.x) - Pa0.b / 2 + 0.5, pl = b.staaf('Kussenligger arm', rolArm, rot([-xa, e0[1], e0[2]]), rot([xa, e0[1], e0[2]]), { v: nn, kap: true }), h0 = pl.P.b / 2 + 0.5; b.kussen('Armkussen', add(rot([-160, e0[1], e0[2]]), mul(nn, h0)), add(rot([160, e0[1], e0[2]]), mul(nn, h0)), nn, 220, 60); }
  b.groep('frame');
  // P2-02 v6: rubberen aanslagen voor begin en einde van de beweging (op de lagerpaal, tegen de arm)
  for (const [nm, dz] of [['Aanslag begin hefboom', -110], ['Aanslag einde hefboom', -190]]) b.plaat(nm, [xo - b.P('frameO').b / 2 - 12, yk - 40, zk + dz - 20], [xo - b.P('frameO').b / 2, yk + 40, zk + dz + 20], { opm: 'gelaste nok 12 mm met een rubberbuffer M10 (stelbaar): de arm slaat niet tot tegen het frame' });
  b.koop('buffer', 2, [], { naam: 'Rubberbuffer M10 op de aanslagen van de hefboom' });
  b.koop('glij45', 4, [], { naam: 'Flensglijlager GFM-4550-30 in de 2 lagerhuizen (2 per huis)' });
  b.koop('stelring45', 2, [], { naam: 'Stelring DIN 705 Ø45 op de as van de hefboom' });
  for (const sx of [-1, 1]) b.pen(`As hefboom in het lagerhuis ${sx < 0 ? 'L' : 'R'}`, [sx * (xh - 30), yk, zk], X, { d: Pas.b, lengte: 58, snedes: 1, t: 10, a: 'frame', b: 'Hefboom', uit: [-200, 0, 0], F: G * 0.6, factor: 'extrinsiekPen', gelast: 'As hefboom' });
  const kracht = (G * Rn) / L;
  {
    // as: buiging (kabel aan de nok + armkracht) en torsie (kabelkracht x Rn), von Mises (P2-01)
    const kf = 2.5, Fc = kf * 1.5 * G * 9.81, Ls = 2 * (xh - 30), xc = xl + Ls / 2, M = (Fc * xc * (Ls - xc)) / Ls * 1.6, W = (Math.PI * Pas.b ** 3) / 32, Tt = Fc * Rn, tau = Tt / (2 * W), sv = Math.hypot(M / W, Math.sqrt(3) * tau);
    b.toets('Sterkte', 'As van de hefboom: buiging en torsie (2 lagers)', `proeflast kabel ${kf} · 1,5 · ${G} kg · g = ${(Fc / 1000).toFixed(2)} kN aan de nok, armkracht erbij (x 1,6, AANNAME); overspanning ${Ls} mm: M ≤ ${(M / 1e6).toFixed(3)} kNm, σ = ${(M / W).toFixed(0)} N/mm²; torsie T = F·R = ${(Tt / 1e6).toFixed(2)} kNm, τ = T/Wp = ${tau.toFixed(0)} N/mm²; σv = √(σ² + 3τ²) = ${sv.toFixed(0)} N/mm² ≤ fy = ${Pas.fy ?? 235} (${Pas.naam})`, sv / (Pas.fy ?? 235), 'EN 1993-1-1 §6.2.5 en §6.2.7 (as op 2 steunpunten, von Mises)');
    { const aw = 4, rw = Pas.b / 2, Tq = Fc * Rn, tw = Tq / (2 * Math.PI * rw * rw * aw); b.toets('Lassen', 'Las nok op de as (torsie)', `hoeklas a${aw} rondom Ø${Pas.b}: τ = T / (2·π·r²·a) = ${(Tq / 1e6).toFixed(2).replace('.', ',')} kNm / (2·π·${rw}²·${aw}) = ${tw.toFixed(0)} N/mm² ≤ fvw,d = 208`, tw / 208, 'EN 1993-1-8 §4.5.3 (vereenvoudigd)'); }
    b.toets('Krachtsverhouding', `Nok: kracht aan ${c.einde === 'rol' ? 'de rol' : c.einde === 'kussen' ? 'het kussen' : 'de greep'} tegenover de stapel`, `nok R${Rn} / arm ${Math.round(L)} mm = ${((Rn / L) * 100).toFixed(0)} % van de stapel (${G} kg): ${Math.round(kracht)} kg aan het einde van de arm ≥ grens ${Math.round(grens)} kg (${c.oef ?? 'druk'}, ${V.naam.toLowerCase()}); stapelweg R·θ = ${slag} mm bij ${Math.round((thMax * 180) / Math.PI)}°; greepweg L·θ = ${Math.round(L * thMax)} mm`, grens / kracht, `AANNAME: merkwaarden (Life Fitness Insignia, Matrix Aura) per soort oefening; hefboomwet`);
  }
  b.o.nok = { Rn, L, G, kracht, grens, slag, greepweg: Math.round(L * thMax), oef: c.oef ?? 'druk', zin: sg, as: [yk, zk], thMax };
  // vloerkatrol onder het raakpunt: aan de kant waar de nok opwikkelt (P1-01)
  const yr = yk + sg * Rn, yf = yr + sg * r, zf = T.a + 25 + r, pf = katrolBeugel(b, 'C (vloer, onder de nok)', [xl, yf, zf], X, { kapKant: [0, 0, 1] });
  b.plaat('Console vloerkatrol', [xl + 24, yf - 40, T.a - 10], [-P.b / 2, yf + 40, T.a], { opm: 'verbindt de katrolbeugel met de vloerligger' });
  b.groep('Afscherming nok');
  {
    // afgeronde nokkap: de vorm van de nok (R + 30) met een schacht voor de kabel naar de vloerkatrol, aan de opwikkelkant
    const Rk = Rn + 30, yb0 = yk + Rn - 45, yb1 = yk + Rn + r + 45, zb = T.a + 25 + 2 * r + 20;
    // P3-01 v6: de kap volgt het segment over de hele slag (geen volle schijf), plus een schacht naar de vloerkatrol
    const lo = Math.min(m0, m1) + Math.min(0, sg * thMax) - rad(8), hi = Math.max(m0, m1) + Math.max(0, sg * thMax) + rad(8), NK = 16;
    const boogK = Array.from({ length: NK + 1 }, (_, i) => lo + ((hi - lo) * i) / NK).map((m) => [yk + Rk * Math.cos(m), zk + Rk * Math.sin(m), 0]);
    const terug = [1, 2, 3, 4, 5].map((i) => hi + ((2 * Math.PI - (hi - lo)) * i) / 6).map((m) => [yk + 130 * Math.cos(m), zk + 130 * Math.sin(m), 30]);
    const vorm = [...boogK, ...terug];
    for (const [nm, x] of [['Nokkap buiten', xl - 32], ['Nokkap binnen', xl + 32]]) b.contour(nm, [x, 0, 0], [0, 1, 0], [0, 0, 1], 1.5, vorm, { kleur: 'kap', banden: 8, opm: 'vlak gelaserd 1,5 mm DC01 (de DXF is de echte vorm): volgt het nok-segment over de slag; rand met een rubberen kantband; 4 x M6 op afstandsbussen aan de lagerpaal-console' });
    let schacht = [[yb0, zb], [yb1, zb], [yb1, zk - 20, 20], [yb0, zk - 20, 20]];
    if (sg < 0) schacht = schacht.map(([y, z, rr]) => [2 * yk - y, z, rr]).reverse();
    for (const [nm, x] of [['Kabelkap buiten', xl - 33.5], ['Kabelkap binnen', xl + 33.5]]) b.contour(nm, [x, 0, 0], [0, 1, 0], [0, 0, 1], 1.5, schacht, { kleur: 'kap', banden: 4, opm: 'vlak gelaserd 1,5 mm DC01: schacht over de kabel van de nok naar de vloerkatrol, rubberen kantband' });
    const g0 = sg > 0 ? yb1 - 10 : yf - r - 45, g1 = T.yt - 3 * r + 10;
    const hg = T.a + 25 + 2 * r + 25 - (T.a - 8), kg = b.plaat('Kabelgoot', [xl - 45, g0, T.a - 8], [xl + 45, g1, T.a + 25 + 2 * r + 25], { kleur: 'kap', opm: 'U-goot over de vloerkatrol en de kabel naar de toren' });
    b.gezet('Kabelgoot', [kg], { t: 1.5, uitslag: uitslagStrook(g1 - g0, [hg, 87, hg], [{ hoek: 90, R: 3, richting: 'op' }, { hoek: 90, R: 3, richting: 'op' }], 1.5), opm: 'gezette U-goot 1,5 mm DC01 (2 zettingen 90° Ri 3), over de vloerkatrol en de kabel naar de toren' });
    b.koop('kapM6', 1, [], { naam: 'Bevestigingsset nokkap en kabelgoot (8 x M6 met kunststof ring)', groep: 'afwerking' });
  }
  b.groep('frame');
  b.kabel('Kabel', [{ p: T.s.oog(xl + 155) }, pa, pd, pf, { p: [xl, yr, zk] }], { last: G, overbrenging: 1, slag, einde: 'nok', opgewikkeld: Math.round(Rn * Math.abs(th)), raak: [xl, yr, zk] });
  station(b, vl, c.station ?? [], Pb, P);
  b.reken('Hefboomarm (kracht aan het einde)', armen[0].d, 'uitkrager', L, 0, { g: (G * Rn) / L / armen.length, proef: 'extrinsiek', las: true, dwars: true });
  b.reken('Lagerpaal (één van de twee)', b.o.delen.find((d) => d.naam === 'Lagerpaal'), 'staanderM', zk - P.h, 0, { g: G / 2, proef: 'extrinsiek', e: 300, las: true });
  b.last('Gebruiker', 100, [0, yk + (c.gebruiker ?? 230), 800], { geval: 'station' }); b.last('Stapel hoog', G, [0, T.yt, 1000], { geval: 'station' });
  void isPro; void gewicht;
}

/**
 * kabelstation: toren met een gebogen arm naar voren (bovenroute, katrol B op afstand yb) en een lage katrol vooraan de
 * toren (onderroute), één kabel met een losse katrol op de stapel (2:1), zoals FK-01. c = { yb, opB, zl (hoogte van de
 * greep boven), greep: 'lat' | 'touw', laagY (lage greep), station: [...], zit: [y, z] }
 */
export function kabelStation(b, def, c) {
  // 1:1 of 2:1 (P1-02 v6): 2:1 alleen als de halve stapel de grens van de oefening haalt, anders twee kabels 1:1 (boven en
  // laag, elk aan een eigen oog van de stapel); de stapelweg is de greepweg gedeeld door de overbrenging
  const n = nokStapel(b), G = n * b.V.stapelKg, grens = NOKGRENS[c.oef ?? 'rug'] * (FV[b.V.id] ?? 1), ov = G / 2 >= grens ? 2 : 1, weg = c.weg ?? 700, slag = Math.round(weg / ov);
  const V = b.V, T = toren(b, { yt: c.yt ?? 1200, H: Math.max(c.H ?? 2150, 60 + 20 * n + slag + 420), ogen: ov === 1 ? [-60, 60] : [], n, slag }), r = T.r, a = T.a, yb = c.yb ?? 420;
  const Pb = b.P(b.V.id === 'thuis' ? 'o120x60x3' : 'o120x60x4'), zArm = T.H + Pb.h / 2, opB = c.opB ?? 120, yk = T.yt - a / 2 - 220;
  const arm = !opB ? b.staaf('Lat-arm', Pb.id, [-60, T.yt + a / 2, zArm], [-60, yb - 60, zArm], { v: X, opm: 'vlakovaalbuis, recht; op de bovenligger van de toren' }) : b.buis('Lat-arm', Pb.id, [[-60, T.yt + a / 2, zArm], [-60, yk, zArm], [-60, yb - 60, zArm + opB]], { vlak: X, opm: `vlakovaalbuis, 1 bocht R${3 * Pb.h}; op de bovenligger van de toren` });
  for (const s2 of [-1, 1]) b.staaf('Schetsplaat lat-arm', 's60x10', [-60 + s2 * (Pb.b / 2 + 5), T.yt + a / 2, T.H + 30], [-60 + s2 * (Pb.b / 2 + 5), T.yt - a / 2 - 150, T.H + 30], { v: X, kap: false, opm: 'schetsplaat 60 x 10 naast de arm (vermoeiing)' });
  const pa = bovenKatrol(b, T, -60, 'voor', 'A (boven de stapel)');
  const pb = katrolBeugel(b, 'B (vooraan de arm)', [-60, yb, T.H - 15 - r], X, { tot: { as: 2, w: T.H + opB * ((yk - yb) / (yk - yb + 60)) - 4 }, kap: false });
  const pc = bovenKatrol(b, T, 60, 'voor', 'C (laag, boven de stapel)'), pd = onderKatrol(b, T, 60, 'D (laag, onderaan)');
  let pL = null;
  if (ov === 2) {
    b.groep(`stapel ${T.s.naam}`);
    const zf = T.s.top + 25 + r + 5; pL = b.katrol('los (op de stapel)', [0, T.yt, zf], Y, { kap: true }); pL.kapTekst = 'binnen de afscherming van de stapel';
    for (const sy of [-1, 1]) b.plaat('Beugel losse katrol', [-30, T.yt + sy * 18, T.s.top], [30, T.yt + sy * 24, zf + 20], { stapel: true, kleur: 'stapel', gaten: [{ p: [0, T.yt + sy * 21, zf], d: 10.5 }], opm: 'op de bovenplaat gelast; as M10 van de losse katrol' });
  }
  b.groep('frame');
  const zl = c.zl ?? 1750;
  if (c.greep === 'touw') b.koop('grepenset', 1, [balk([-60, yb - r, zl - 300], [-60, yb - r, zl], X, 28, 28, true, 'kabel')], { naam: 'Tricepstouw met karabiner (bovenroute)' });
  else b.koop(V.latbar, 1, [balk([-660, yb - r, zl], [540, yb - r, zl], Y, 30, 30, true, 'kartel'), balk([-60, yb - r, zl + 160], [-60, yb - r, zl + 175], Y, 22, 22, true, 'ring'), ...[-1, 1].map((sx) => balk([-60, yb - r, zl + 160], [-60 + sx * 220, yb - r, zl + 8], Y, 5, 5, true, 'kabel'))], { naam: 'Latstang met V-strop en karabijn aan het kabeleind' });
  b.koop(V.handgreep, 1, [balk([60, T.yt - 3 * r - 400, T.a + 25], [60, T.yt - 3 * r - 260, T.a + 25], X, 30, 30, true, 'chroom')]);
  b.koop('kabelstop', 2, [], { naam: 'Stopkogel aan beide uiteinden' });
  const eindB = { p: [-60, yb - r, c.greep === 'touw' ? zl : zl + 175] }, eindL = { p: [60, T.yt - 3 * r - 260, T.a + 25] };
  if (ov === 2) b.kabel('Kabel boven en laag', [eindL, pd, pc, pL, pa, pb, eindB], { last: G, overbrenging: 2, slag, begin: 'anker' });
  else { b.kabel('Kabel boven', [{ p: T.s.oog(-60) }, pa, pb, eindB], { last: G, overbrenging: 1, slag }); b.kabel('Kabel laag', [{ p: T.s.oog(60) }, pc, pd, eindL], { last: G, overbrenging: 1, slag }); }
  const kracht = G / ov;
  b.toets('Krachtsverhouding', `Kabelstation: kracht aan de greep (${ov}:1)`, `stapel ${G} kg, overbrenging ${ov}:1: ${Math.round(kracht)} kg aan de greep ≥ grens ${Math.round(grens)} kg (${c.oef ?? 'rug'}, ${V.naam.toLowerCase()}); stapelweg ${slag} mm bij ${weg} mm greepweg`, grens / kracht, 'AANNAME: merkwaarden (Life Fitness Insignia, Matrix Aura) per soort oefening');
  b.o.kracht = { kracht, grens, oef: c.oef ?? 'rug', overbrenging: ov };
  const { vl } = vloer(b, T);
  station(b, vl, c.station ?? [], b.P('bank'), b.P('ligger'));
  b.reken('Lat-arm (uitkragend, kabel over 90°: 1,41 x de kabelkracht)', arm, 'uitkrager', T.yt - yb, 0, { g: 1.41 * G, proef: 'extrinsiek', las: true });
  b.reken('Torenstaander', T.sL, 'staander', T.H - a, 0, { g: 3 * G, proef: 'extrinsiek' });
  b.last('Gebruiker in het station', 100, [0, yb + 200, 700], { geval: 'kabel' }); b.last('Stapel (hoogste stand)', G, [0, T.yt, T.s.top + T.s.slag - 150], { geval: 'kabel' });
}

/** het station: zitting, rug-, borst-, lig- en armkussens op palen op de vloerligger, handgrepen en een platform */
function station(b, vl, delen, Pb, P) {
  for (const s of delen) {
    if (s.zit) zitting(b, vl, s.zit[0], s.zit[1], s.lang ?? 340, s.breed ?? 320, { verstel: s.verstel ?? true }); // P2-02 v6: zitting op een veerpen, verstelbaar
    else if (s.rug) { staander(b, 'Rugpaal', 'bank', 0, s.rug[0], P.h, s.rug[2]); b.kussen('Rugleuning', [0, s.rug[0] - Pb.h / 2, s.rug[1]], [0, s.rug[0] - Pb.h / 2, s.rug[2]], [0, -1, 0], s.breed ?? 320, 68); }
    else if (s.borst) { staander(b, 'Kussenpaal', 'bank', 0, s.borst[0], P.h, s.borst[2]); b.kussen('Borstkussen', [0, s.borst[0] + Pb.h / 2, s.borst[1]], [0, s.borst[0] + Pb.h / 2, s.borst[2]], [0, 1, 0], s.breed ?? 300, 68); }
    else if (s.lig) {
      const [y0, y1, z] = s.lig;
      const lb = b.staaf('Ligbalk', 'bankO', [0, y0, z - Pb.h / 2 - 5], [0, y1, z - Pb.h / 2 - 5]);
      for (const y of [y0 + 120, y1 - 120]) staander(b, 'Ligpaal', 'bank', 0, y, P.h, z - Pb.h - 5);
      b.kussen('Ligkussen', [0, y0, z - 5], [0, y1, z - 5], [0, 0, 1], s.breed ?? 320, 68); void lb;
    } else if (s.armkussen) {
      // armkussen op een hoek (preacher): h = helling (0,5 = 27°), hoog aan de kant van de gebruiker (kant -1: gebruiker vóór)
      const [y, z, h] = s.armkussen, k = s.kant ?? 1, Pl = b.P('bankLicht'), a = Math.atan(h ?? 0), u = [0, k * Math.cos(a), -Math.sin(a)], n = norm([0, k * Math.sin(a), Math.cos(a)]);
      const p0 = add([0, y, z - 71 - Pl.h / 2], mul(u, -130)), p1 = add([0, y, z - 71 - Pl.h / 2], mul(u, 130));
      staander(b, 'Armpaal', 'bank', 0, y, P.h, z - 71 - Pl.h / 2 - Pl.h / 2 / Math.cos(a) + 3);
      const pl = b.staaf('Armkussenplaat', 'bankLicht', p0, p1, { v: [1, 0, 0] });
      b.kussen('Armkussen vast', add(p0, mul(n, Pl.h / 2 + 0.5)), add(p1, mul(n, Pl.h / 2 + 0.5)), n, 360, 60); void pl;
    } else if (s.voetsteun) { const [y, z] = s.voetsteun; staander(b, 'Voetsteunpaal', 'bank', 0, y, P.h, z - 120); b.plaat('Voetsteun', [-200, y - 6, z - 120], [200, y + 6, z + 120], { opm: 'plaat 12 mm met antislip en hielrand' }); }
    else if (s.kniesteun) { const [y, z] = s.kniesteun; staander(b, 'Kniepaal', 'bank', 0, y, P.h, z - 8); b.staaf('As kniesteun', 'as', [-260, y, z], [260, y, z], { kap: false, in: 'kniepaal' }); b.koop(b.V.schuimrol, 2, [-1, 1].map((sx) => balk([sx * 65, y, z], [sx * 265, y, z], [1, 0, 0], 100, 100, true, 'leer')), { naam: 'Schuimrol Ø100 (kniesteun)' }); }
    else if (s.greepVast) { const [y, z] = s.greepVast; staander(b, 'Greeppaal', 'bank', 0, y, P.h, z + 20); for (const sx of [-1, 1]) b.staaf('Handgreep', 'greep', [sx * (Pb.b / 2), y, z], [sx * 280, y, z], {}); }
    else if (s.platform) { const [y0, y1] = s.platform; for (const sx of [-1, 1]) b.plaat('Platform', [sx > 0 ? P.b / 2 : -185, y0, P.h], [sx > 0 ? 300 : -P.b / 2, y1, P.h + 8], { opm: 'traanplaat 8 mm met antislip (links smaller: vrij van de vloerkatrol)' }); }
  }
}

const MS = (t, p, bt, bp) => ({ thuis: t, pro: p, bronT: bt, bronP: bp });
// soort oefening per nokstation (bepaalt de grens aan de greep, P1-02)
const OEF = { 'FS-01': 'druk', 'FS-02': 'druk', 'FS-03': 'arm', 'FS-04': 'arm', 'FS-05': 'romp', 'FS-06': 'romp', 'FS-07': 'druk', 'FS-08': 'rug', 'FS-09': 'druk', 'FS-10': 'kuit', 'FS-11': 'kuit', 'FS-12': 'been', 'FS-23': 'been', 'FS-24': 'been' };
const S = (id, naam, kort, uitleg, spieren, oefeningen, maxLast, markt, cfg) => ({ id, soort: 'selectorized', naam, kort, uitleg, spieren, oefeningen, maxLast, markt, maten: MATEN, cfg: { oef: OEF[id], ...cfg }, bouw(b) { nokStation(b, this, this.cfg); } });
const OEFK = { 'FS-13': 'trek', 'FS-14': 'arm', 'FS-15': 'romp', 'FS-16': 'trek', 'FS-17': 'rug', 'FS-18': 'arm', 'FS-19': 'trek', 'FS-20': 'arm', 'FS-21': 'trek', 'FS-22': 'arm', 'FS-25': 'trek' };
const K = (id, naam, kort, uitleg, spieren, oefeningen, markt, cfg) => ({ id, soort: 'selectorized', naam, kort, uitleg, spieren, oefeningen, markt, maten: MATEN, cfg: { oef: OEFK[id], ...cfg }, bouw(b) { kabelStation(b, this, this.cfg); } });
const MK = MS([900, 2300], [3300, 6200], 'ATX / Tunturi kabelstations met stapel € 899-2299', 'Life Fitness Insignia / Matrix Aura kabelstations ± € 3300-6200');
export const SELECTORIZED = [
  S('FS-01', 'Chest press (selectorized)', 'Borstpers met stapel, hefboom op een as achter de schouders.', 'Zitting en rugleuning; twee armen hangen aan een as achter en boven de schouders en komen met de grepen voor de borst. Een nok op de as tilt de stapel.', 'borst, voorste schouder, triceps', ['chest press', 'enkelarmige chest press'], undefined,
    MS([1500, 2600], [3900, 7800], 'ATX selectorized chest press ± € 1500, Tunturi Platinum Chest Press € 2599', 'Life Fitness Insignia Chest Press ± € 7800, Technogym Selection ± € 6900, Matrix Aura ± € 3900'),
    { as: [1080, 1480], hoek: -40, xo: 440, armen: [{ x: -300, naar: [-560, -330] }, { x: 300, naar: [-560, -330] }], einde: 'greep', greepSchuin: -20, station: [{ zit: [760, 480], lang: 300 }, { rug: [970, 560, 1250] }], gebruiker: -100, toren: 820 }),
  S('FS-02', 'Shoulder press (selectorized)', 'Schouderpers met stapel, grepen boven de schouders.', 'Zitting en rechte rugleuning; twee armen aan een as achter de rug, de grepen naast de schouders gaan omhoog. Een nok op de as tilt de stapel.', 'schouders, triceps', ['shoulder press'], undefined,
    MS([1500, 2600], [3900, 7600], 'ATX selectorized shoulder press ± € 1500, Tunturi Platinum € 2599', 'Life Fitness Insignia Shoulder Press ± € 7600, Matrix Aura ± € 3900'),
    { as: [1090, 1150], hoek: -55, xo: 440, armen: [{ x: -300, naar: [-200, 420] }, { x: 300, naar: [-200, 420] }], einde: 'greep', station: [{ zit: [780, 480], lang: 300 }, { rug: [990, 560, 1150] }], gebruiker: -150, toren: 760 }),
  S('FS-03', 'Biceps curl (selectorized)', 'Bicepscurl met armkussen en stapel.', 'Zitting en een schuin armkussen; de as ligt op ellebooghoogte, de dwarsgreep draait naar de schouders. Een nok op de as tilt de stapel.', 'biceps, onderarmen', ['biceps curl', 'enkelarmige curl'], undefined,
    MS([1200, 2200], [3300, 6200], 'ATX biceps curl selectorized ± € 1200, Tunturi Platinum Biceps € 2199', 'Life Fitness Insignia Biceps Curl ± € 6200, Matrix Aura ± € 3300'),
    { as: [430, 1000], hoek: 75, xo: 440, armen: [{ x: -300, naar: [-330, 0] }, { x: 300, naar: [-330, 0] }], einde: 'dwars', station: [{ zit: [800, 480] }, { armkussen: [560, 960, 0.5] }], gebruiker: 300 }),
  S('FS-04', 'Triceps extension (selectorized)', 'Tricepsstrekker met armkussen en stapel.', 'Zitting en armkussen; de as ligt op ellebooghoogte, je duwt de greep van bij de schouders naar beneden en naar voren.', 'triceps', ['triceps extension'], undefined,
    MS([1200, 2200], [3300, 6200], 'ATX triceps selectorized ± € 1200, Tunturi Platinum € 2199', 'Life Fitness Insignia Triceps Extension ± € 6200, Matrix Aura ± € 3300'),
    { as: [430, 1000], hoek: -100, xo: 440, armen: [{ x: -300, naar: [0, 330] }, { x: 300, naar: [0, 330] }], einde: 'dwars', station: [{ zit: [800, 480] }, { armkussen: [560, 960, 0.5] }], gebruiker: 300 }),
  S('FS-05', 'Abdominal crunch (selectorized)', 'Buikcrunch met borstkussen op de hefboom.', 'Zitting met rugleuning; een kussen op de hefboom ligt tegen de borst en draait mee naar voren en naar beneden.', 'rechte buikspier', ['abdominal crunch'], undefined,
    MS([1200, 2300], [3300, 6500], 'ATX ab crunch selectorized ± € 1200, Tunturi Platinum Abdominal € 2299', 'Life Fitness Insignia Abdominal ± € 6500, Matrix Aura ± € 3300'),
    { as: [1080, 1100], hoek: -35, xo: 440, armen: [{ x: -300, naar: [-330, 300] }, { x: 300, naar: [-330, 300] }], einde: 'dwars', station: [{ zit: [760, 470], lang: 300 }, { rug: [970, 560, 1000] }], gebruiker: -100, toren: 820 }),
  S('FS-06', 'Back extension (selectorized)', 'Onderrug: rugkussen op de hefboom, zittend.', 'Zitting met voetsteun; het kussen op de hefboom ligt tegen de bovenrug en je duwt het naar achter.', 'onderrug, bilspieren', ['back extension'], undefined,
    MS([1200, 2300], [3300, 6500], 'ATX back extension selectorized ± € 1200, Tunturi Platinum Lower Back € 2299', 'Life Fitness Insignia Back Extension ± € 6500, Matrix Aura ± € 3300'),
    { as: [880, 560], hoek: 35, xo: 440, armen: [{ x: -300, naar: [60, 560] }, { x: 300, naar: [60, 560] }], einde: 'kussen', kussenN: [0, -1, 0], station: [{ zit: [700, 480] }, { greepVast: [480, 520] }], gebruiker: -150, toren: 820 }),
  S('FS-07', 'Incline chest press (selectorized)', 'Schuine borstpers: de grepen gaan schuin omhoog.', 'Zitting en schuine rugleuning; de armen hangen aan een as hoog achter de schouders, de grepen komen ter hoogte van de bovenborst en gaan schuin omhoog.', 'bovenste borst, schouders, triceps', ['incline press'], undefined,
    MS([1500, 2600], [3900, 7800], 'ATX incline press selectorized ± € 1500', 'Life Fitness Insignia Incline ± € 7800, Matrix Aura ± € 3900'),
    { as: [1080, 1620], hoek: -40, xo: 440, armen: [{ x: -300, naar: [-520, -280] }, { x: 300, naar: [-520, -280] }], einde: 'greep', greepSchuin: -20, station: [{ zit: [760, 470], lang: 300 }, { rug: [970, 560, 1300] }], gebruiker: -100, toren: 820 }),
  S('FS-08', 'Pullover (selectorized)', 'Pullover: de dwarsgreep boven het hoofd naar beneden trekken.', 'Zitting en rugleuning; de as ligt op schouderhoogte naast de gebruiker, de dwarsgreep begint boven en achter het hoofd en komt voor het lichaam.', 'brede rugspier, borst', ['pullover'], undefined,
    MS([1500, 2600], [3900, 7200], 'ATX pullover selectorized ± € 1500', 'Nautilus / Life Fitness pullover ± € 7200, Matrix ± € 3900'),
    { as: [1080, 1350], hoek: -70, xo: 440, armen: [{ x: -300, naar: [-150, 450] }, { x: 300, naar: [-150, 450] }], einde: 'dwars', station: [{ zit: [760, 470], lang: 300 }, { rug: [970, 560, 1200] }], gebruiker: -100, toren: 820 }),
  S('FS-09', 'Seated dip (selectorized)', 'Tricepsdip zittend: de grepen naast de zitting naar beneden duwen.', 'Zitting en rugleuning; de as ligt achter de rug op schouderhoogte, de grepen naast de heupen gaan naar beneden.', 'triceps, borst', ['seated dip'], undefined,
    MS([1300, 2400], [3500, 6800], 'ATX seated dip selectorized ± € 1300', 'Life Fitness Insignia Seated Dip ± € 6800, Matrix Aura ± € 3500'),
    { as: [1080, 1250], hoek: 45, xo: 440, armen: [{ x: -300, naar: [-430, -250] }, { x: 300, naar: [-430, -250] }], einde: 'greep', station: [{ zit: [760, 470], lang: 300 }, { rug: [970, 560, 1100], breed: 240 }], gebruiker: -100, toren: 820 }),
  S('FS-10', 'Seated calf raise (selectorized)', 'Kuitmachine zittend met kniekussen op de hefboom.', 'Zitting en voetplatform; het kussen op de hefboom ligt op de knieën en gaat omhoog als je op de tenen duwt.', 'kuiten (soleus)', ['seated calf raise'], undefined,
    MS([1200, 2200], [3300, 6000], 'ATX calf selectorized ± € 1200', 'Life Fitness Insignia Seated Calf ± € 6000, Matrix ± € 3300'),
    { as: [260, 600], hoek: 20, xo: 440, armen: [{ x: -300, naar: [300, 60] }, { x: 300, naar: [300, 60] }], einde: 'kussen', kussenN: [0, 0, -1], station: [{ zit: [780, 420], lang: 300 }, { platform: [350, 620] }], gebruiker: 300 }),
  S('FS-11', 'Standing calf raise (selectorized)', 'Kuitmachine staand met schouderkussens op de hefboom.', 'Voetplatform onder de schouderkussens; de kussens op de hefboom liggen op de schouders en gaan omhoog als je op de tenen gaat staan.', 'kuiten', ['standing calf raise'], undefined,
    MS([1300, 2400], [3500, 6500], 'ATX standing calf selectorized ± € 1300', 'Life Fitness / Matrix standing calf ± € 3500-6500'),
    { as: [260, 1500], hoek: 15, xo: 440, armen: [{ x: -300, naar: [380, 0] }, { x: 300, naar: [380, 0] }], einde: 'kussen', kussenN: [0, 0, -1], station: [{ platform: [500, 900] }], gebruiker: 400, toren: 1000 }),
  S('FS-12', 'Prone leg curl (selectorized)', 'Liggende beencurl met rol achter de enkels.', 'Ligbank op heuphoogte; de as ligt bij de knieën aan het einde van de bank, de rol achter de enkels draait omhoog naar de billen.', 'hamstrings', ['lying leg curl'], undefined,
    MS([1200, 2300], [3300, 6800], 'ATX prone leg curl selectorized ± € 1200', 'Life Fitness Insignia Prone Leg Curl ± € 6800, Matrix ± € 3300'),
    { as: [330, 720], hoek: -75, xo: 360, armen: [{ x: 90, naar: [-420, 20] }], einde: 'rol', station: [{ lig: [380, 1350, 720] }, { greepVast: [1450, 760] }], gebruiker: 600, toren: 1350 }),
  K('FS-13', 'Lat pulldown (selectorized)', 'Lat pulldown met verstelbare zitting en kniesteun.', 'Omkapte stapel, gebogen arm met de bovenkatrol; zitting en kniesteun.', 'brede rugspier, biceps', ['lat pulldown', 'close grip pulldown'], MK, { yb: 420, station: [{ zit: [440, 480], verstel: true }] }),
  K('FS-14', 'Triceps pushdown (selectorized)', 'Staand station met tricepstouw aan de bovenkatrol.', 'Omkapte stapel met een korte arm; je staat op het platform en duwt het touw naar beneden.', 'triceps', ['pushdown', 'overhead extension'], MK, { yb: 700, opB: 0, H: 2100, zl: 1400, greep: 'touw', station: [{ platform: [380, 800] }] }),
  K('FS-15', 'Cable crunch (selectorized)', 'Knielend crunchstation met kniekussen en touw.', 'Omkapte stapel; je knielt op het kussen en trekt het touw van boven het hoofd naar de knieën.', 'buikspieren', ['cable crunch'], MK, { yb: 520, zl: 1300, greep: 'touw', station: [{ lig: [360, 760, 300], breed: 360 }] }),
  K('FS-16', 'High row (selectorized)', 'Roeien van boven naar de borst, met borstkussen.', 'Omkapte stapel met een lange arm; zitting en borstkussen, de greep komt van voren boven.', 'midden van de rug, achterkant schouder', ['high row', 'face pull'], MK, { yb: 440, zl: 1550, station: [{ zit: [600, 470], lang: 300 }, { borst: [370, 900, 1300] }, { kniesteun: [830, 640] }] }),
  K('FS-17', 'Straight-arm pulldown (selectorized)', 'Staand station met dwarsstang aan de bovenkatrol.', 'Omkapte stapel; je staat voor het station en duwt de stang met gestrekte armen naar de dijen.', 'brede rugspier', ['straight-arm pulldown'], MK, { yb: 620, zl: 1650, station: [{ platform: [300, 800] }] }),
  K('FS-18', 'Preacher cable curl (selectorized)', 'Zittende curl aan de lage katrol met armkussen.', 'Omkapte stapel; zitting en schuin armkussen voor de toren, de greep aan de lage katrol.', 'biceps', ['cable curl', 'preacher curl'], MK, { yb: 420, station: [{ zit: [600, 480], lang: 300 }, { armkussen: [340, 900, 0.6], kant: -1 }] }),
  K('FS-19', 'Seated cable row (selectorized)', 'Roeien aan de lage katrol met borstkussen.', 'Omkapte stapel; zitting en borstkussen, de greep komt van de lage katrol vooraan de toren.', 'midden van de rug, biceps', ['seated row', 'enkelarmige row'], MK, { yb: 420, station: [{ zit: [420, 470], lang: 300 }, { borst: [690, 850, 1250] }, { voetsteun: [800, 300] }] }),
  K('FS-20', 'Face pull station (selectorized)', 'Staand station met touw op gezichtshoogte.', 'Omkapte stapel met een korte, lage arm; je staat op het platform en trekt het touw naar het gezicht.', 'achterkant schouder, rotatoren', ['face pull', 'high row staand'], MK, { yb: 640, opB: 0, H: 1950, zl: 1680, greep: 'touw', station: [{ platform: [300, 760] }] }),
  K('FS-21', 'Kneeling lat (selectorized)', 'Knielend latstation met kniekussen.', 'Omkapte stapel; je knielt op het kussen en trekt de stang van boven naar de borst.', 'brede rugspier', ['kneeling pulldown', 'cable crunch'], MK, { yb: 440, zl: 1600, station: [{ lig: [380, 760, 300], breed: 360 }, { kniesteun: [820, 560] }] }),
  K('FS-22', 'Kabelkolom (selectorized)', 'Staand station met touw boven en greep onder.', 'Omkapte stapel met een arm op 1,9 m; boven een touw, onder een greep aan de lage katrol.', 'armen, schouders, rug, benen', ['pushdown', 'curl', 'upright row', 'kickback'], MK, { yb: 600, opB: 60, H: 2000, zl: 1500, greep: 'touw', station: [{ platform: [260, 760] }] }),
  S('FS-23', 'Leg extension (selectorized, pro-lijn)', 'Beenstrekker met scheenrol en nok.', 'Zitting met rugleuning; de as ligt op kniehoogte, de scheenrol draait naar voren omhoog.', 'quadriceps', ['leg extension'], undefined,
    MS([900, 2350], [3490, 7940], 'ATX leg extension € 899-999, Tunturi Platinum € 2199', 'Life Fitness Insignia Leg Extension ± € 6900, Hammer Strength Select € 7943'),
    { as: [330, 560], hoek: -80, xo: 360, armen: [{ x: 90, naar: [-60, -400] }], einde: 'rol', station: [{ zit: [590, 480], lang: 300 }, { rug: [800, 560, 1100] }], gebruiker: 230 }),
  S('FS-24', 'Seated leg curl (selectorized, pro-lijn)', 'Beencurl zittend met dijklem en enkelrol.', 'Zitting met rugleuning; de as ligt op kniehoogte, de rol achter de enkels draait naar onder en achter.', 'hamstrings', ['seated leg curl'], undefined,
    MS([900, 2350], [3490, 7940], 'ATX leg curl € 899-999, Tunturi Platinum € 2199', 'Life Fitness Insignia Seated Leg Curl ± € 6900, Hammer Strength Select € 7943'),
    { as: [330, 560], hoek: 75, xo: 360, armen: [{ x: 90, naar: [-420, 40] }], einde: 'rol', station: [{ zit: [590, 480], lang: 300 }, { rug: [800, 560, 1100] }], gebruiker: 230 }),
  K('FS-25', 'Standing low row (selectorized)', 'Staand roeien aan de lage katrol met voetsteun.', 'Omkapte stapel; je staat op het platform met de voeten tegen de steun en trekt de greep van de lage katrol.', 'rug, biceps, benen', ['standing row', 'deadlift-row'], MK, { yb: 440, station: [{ platform: [380, 820] }] }),
];
void Y; void sub;
