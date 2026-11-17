// Selectorized toestellen (FS-01 ..): een eigen gewichtstapel met selectiepen in een volledig omkapte toren, en een
// hefboom op een as in twee lagerhuizen. Op de as zit een nok (segment R ≤ 220) die de nokkabel opwikkelt: die loopt
// naar een vloerkatrol, onder de toren door naar een geleid takelblok achter de toren (2:1) dat de stapel heft (v7). De gebruiker zit, ligt
// of staat in een station (zitting, rug-, borst-, arm- of ligkussen) en duwt of trekt aan een rol, een greep of een
// kussen op de hefboom. Alles in de pro-vormtaal (ovaalbuis, kappen) van de bestaande kabelmachines. Node en browser.
import { staander, ligger, voetjes, katrolBeugel, kussenOp, X, Y, Z, balk, add, mul, sub, norm } from './bouwstenen.mjs';
import { cirkelPunten } from './vorm.mjs';
import { toren, bovenKatrol, onderKatrol, vloer, zitting, gewicht, isPro, voetPunten } from './kabel.mjs';
import { uitslagStrook } from './vorm.mjs';
import { KOOP } from './onderdelen.mjs';

const rad = (g) => (g * Math.PI) / 180;
const MATEN = ['compact', 'standaard', 'XL'];

/** grens aan de greep per soort oefening, in kg bij de pro-stapel (thuis 60 %, semi 80 %: AANNAME, geen merkdata voor
 *  thuistoestellen gevonden). v8 (P2-02): per soort de stapel x katrolverhouding van een merktoestel met een productblad;
 *  Nautilus Impact geeft voor alle selectorized toestellen "pulley ratio 1:1" (Core Health & Fitness, productbladen).
 *  AANNAME: met een nok is de gemiddelde verhouding aan de greep ook ± 1:1 (merken geven de kracht aan de greep niet op). */
export const NOKGRENS = { druk: 130, trek: 130, rug: 130, been: 130, kuit: 130, arm: 90, romp: 65, lagerug: 130 };
const NI = (m, kg) => `Nautilus Impact ${m}: stapel ${kg} kg, pulley ratio 1:1 (corehandf.com, productblad ${m.replace(/ /g, '_')})`;
export const NOKGRENS_BRON = {
  druk: `${NI('Chest Press 9NA-S4301', 130)}; ook Shoulder Press 9NA-S4307 en Dip 9NA-S5303 130 kg; Life Fitness Insignia Chest Press 130/152 kg (verhouding niet opgegeven)`,
  trek: `${NI('Lat Pull Down 9NA-S3305', 130)}; Hammer Strength Select Lat Pulldown 295 lb, Cybex Prestige 245/305 lb (verhouding niet opgegeven)`,
  rug: `${NI('Low Row 9NA-S3306', 130)}; ook Vertical Row 9NA-S3301 130 kg`,
  been: `${NI('Leg Extension 9NA-S1312', 130)}; Seated Leg Curl 130 kg, Leg Curl 90 kg; Life Fitness Insignia Leg Extension 130/152 kg`,
  kuit: `${NI('Standing Calf 9NA-S1309', 130)}; Matrix Ultra Calf Extension 135/180 kg (verhouding niet opgegeven)`,
  arm: `${NI('Biceps Curl 9NA-S5301', 90)}; ook Tricep Extension 9NA-S5302 90 kg`,
  romp: `${NI('Abdominal 9NA-S6301', 65)}`,
  lagerug: `${NI('Low Back 9NA-S3302', 130)}`,
};
/** v6b: de nok van de merken is compact (R ± 100-220 mm, zie docs/Normen-en-bronnen.md); de kracht komt uit een 2:1-takel.
 *  v7 (N-P1-01): het takelblok hangt geleid achter de toren (2 geleidestangen Ø25 met lineaire lagers, in een gesloten koker);
 *  de nokkabel trekt het blok omlaag, de stapelkabel loopt over de losse katrol op het blok: kabelkracht aan de nok 2 x stapel,
 *  stapelslag 2·R·θ. Staalkabel op stalen kabelschijven met een datablad (N-P2-03). */
export const NOK_RMAX = 220, NOK_TAKEL = 2;
export const NOK_KABEL = { stapel: 'kabel6s', nok: 'kabel8s' }, NOK_SCHIJF = { stapel: 'rz05', nok: 'rz10' };
const FV = { thuis: 0.6, semi: 0.8, pro: 1 };
/** stapel van een nokstation: thuis 20, semi 26, pro 34 platen van 5 kg (v7: pro 170 kg haalt de grens 110 kg met nok R ≤ 220) */
export const nokStapel = (b) => ({ thuis: 20, semi: 26, pro: 34 }[b.V.id] ?? 20);
/** stapel van een kabelstation (1:1 of 2:1 aan de greep, kabel Ø6 van de fitnesshandel): thuis 18, semi 22, pro 26 platen (v8: trek 130 kg 1:1 bij pro)
 *  (v7, N-P1-03: met de echte massa blijven kabel en katrollen onder 90 %; de grens trek 100 kg haalt pro nog 1:1) */
export const kabelStapel = (b) => ({ thuis: 18, semi: 22, pro: 26 }[b.V.id] ?? 18);

/**
 * nokstation: c = { as: [y, z] draaipunt, hoek (graden bij stand 1, teken = draairichting), oef (soort voor de grens),
 *   xo (lagerpalen op ±xo), armen: [{ x, naar: [dy, dz] }], einde: 'rol' | 'greep' | 'dwars' | 'kussen', station, toren }
 * De nok is een segment (cam) met straal Rn = grens · L / stapel (P1-02); de kabel loopt van de raaklijn aan de kant
 * waar de nok opwikkelt naar een vloerkatrol (P1-01: bij een negatieve hoek vóór de as); de stapel stijgt R·θ (P1-03).
 */
export function nokStation(b, def, c) {
  const xl = -230, V = b.V, P = b.P('ligger'), Pb = b.P('bank'), [yk, zk] = c.as, aT = b.P('toren').b;
  // v8: de stapel per toestel: minstens nokStapel, en genoeg om met R max de grens te halen (max. 44 platen)
  const L = Math.hypot(...c.armen[0].naar), grens = NOKGRENS[c.oef ?? 'druk'] * (FV[V.id] ?? 1), Rmax = Math.min(NOK_RMAX, zk - 160);
  const n = Math.min(44, Math.max(nokStapel(b), Math.ceil((grens * L * 1.02) / (NOK_TAKEL * Rmax) / V.stapelKg))), G = n * V.stapelKg;
  const Rmax_ = Rmax, Rn = Math.min(Rmax, Math.max(100, Math.ceil((grens * L * 1.02) / (NOK_TAKEL * G) / 10) * 10)); void Rmax_;
  const sg = Math.sign(c.hoek) || 1, thMax = rad(Math.min(75, Math.abs(c.hoek))), wik = Math.round(Rn * thMax), slag = NOK_TAKEL * wik;
  // v7: kabelschijven met datablad (Rema RZ): rs voor de stapelkabel (Ø6), rn voor de nokkabel (Ø8); de vloerkabel loopt op zc
  const rs = KOOP[NOK_SCHIJF.stapel].D / 2, rn = KOOP[NOK_SCHIJF.nok].D / 2, OH = 15, zc = aT + 25, zf = zc + rn;
  // N-P1-05: de vloerkatrol ligt altijd aan de torenkant van de verticale kabel (in de binnenhoek: de kabel komt van de toren)
  const yr = yk + sg * Rn, yf = yr + rn;
  // N-P2-04 v7: de takel staat achter de toren; de toren hoeft alleen vrij te blijven van de vloerkatrol en haar kap
  const ytMin = yf + rn + 40 + 100 + aT / 2 + 15;
  const Ht = Math.max(1800, zk + 420, 60 + 20 * n + slag + 420 + OH), zAo = Ht - aT - 15 - 2 * rs - 30;
  // N-P2-04 v7: de toren zo dicht mogelijk achter het station: achter de zitting/kussens, achter de armen (stand 0 en 1),
  // achter de voet van de lagerpalen (yk + 250) met een korte torenvoet (200 mm naar voren)
  const stY = (s) => (s.zit ? s.zit[0] + (s.lang ?? 340) / 2 + 20 : s.rug ? s.rug[0] + 45 : s.borst ? s.borst[0] + 110 : s.lig ? s.lig[1] + 20 : s.armkussen ? s.armkussen[0] + 200 : s.voetsteun ? s.voetsteun[0] + 10 : s.kniesteun ? s.kniesteun[0] + 60 : s.greepVast ? s.greepVast[0] + 40 : s.platform ? s.platform[1] : -Infinity);
  const armY = c.armen.flatMap((a) => [0, 1].map((st) => { const t2 = sg * thMax * st, dy = a.naar[0], dz = a.naar[1]; return yk + dy * Math.cos(t2) - dz * Math.sin(t2) + 120; }));
  const yStat = Math.max(yk + 250 + 40, ...(c.station ?? []).map(stY), ...armY), yt0 = Math.max(ytMin, yStat + 78 + 40, yk + 200 + 255);
  const T = toren(b, { x0: -155, yt: c.toren7 ?? yt0, H: Ht, voorVoet: 200, ogen: [xl + 155], n, slag, onderHoog: OH,
    doorvoer: [[xl - 16, zc - 14, 4], [xl + 16, zc - 14, 4], [xl + 16, zc + 14, 4], [xl - 16, zc + 14, 4]], openAchter: [[xl - 70, zAo, 6], [xl + 70, zAo, 6], [xl + 70, Ht + 10, 6], [xl - 70, Ht + 10, 6]] });
  // ---- vormtaal v8 (Fable §4 voorstel 2 en 4): toren en station op één gesloten voetlus (gebogen koker, geen losse
  // T-voeten); de lagers zitten in een dubbel gelaserd lagerschild (2 x 10 mm, ronde kop) dat zelf de paal is
  const XR = -T.x0 + T.xs, yF = 40, a = P.b, xh = XR + 35, Pas = b.P('r55'); // v8: as Ø55 (stapel tot 200 kg) // XR = de lijn van de linker torenvoet
  const lus = b.buis('Voetlus', 'ligger', [[-XR, T.yt - 200, a / 2], [-XR, yF + a / 2, a / 2], [XR, yF + a / 2, a / 2], [XR, T.yt + 300, a / 2]], { vlak: [0, 0, 1], R: 3 * a, opm: `koker ${P.naam ?? 'ligger'} gebogen tot een U (2 bochten R${3 * a}): voorvoet en twee zijliggers in één stuk; de linkerpoot sluit aan op de torenvoet` });
  voetPunten(b, [[-XR, yF + a], [XR, yF + a], [XR, T.yt + 260], [-XR, (yF + T.yt) / 2], [XR, (yF + T.yt) / 2]], 'de voetlus');
  const [vmn] = [T.voor.mn ?? T.voor.a];
  const vl = b.staaf('Vloerligger', 'ligger', [0, yF + a - 1, a / 2], [0, Math.min(T.voor.a[1], T.voor.b[1]) - a / 2, a / 2], { opm: 'koker tussen de voetlus en de voorligger van de toren: draagt de zitting en de rug' });
  void vmn; void lus;
  const Ps = 10, hull = omhul([[yk - 150, a], [yk + 150, a], ...Array.from({ length: 24 }, (_, i) => (2 * Math.PI * i) / 24).map((m) => [yk + 100 * Math.cos(m), zk + 100 * Math.sin(m)])]);
  for (const sx of [-1, 1]) {
    for (const dx of [-25, 25]) b.contour('Lagerschild', [sx * (XR + dx), 0, 0], [0, 1, 0], [0, 0, 1], Ps, hull.map(([y, z]) => [y, z, 0]), { banden: 10, gaten: [{ x: yk, y: zk, d: 70.5, zitting: true }], opm: `lagerschild ${Ps} mm S355 gelaserd: de paal van het lager (2 per kant, 50 mm uit elkaar), op de voetlus en rond het lagerhuis gelast` });
    for (const sy of [-1, 1]) b.plaat('Schildrib', [sx * (XR - 20), yk + sy * 140 - 5, a], [sx * (XR + 20), yk + sy * 140 + 5, a + 300], { opm: 'rib 10 mm tussen de twee lagerschilden (doos), op de voetlus gelast' });
    b.staaf('Lagerhuis', 'b70x12', [sx * (xh - 70), yk, zk], [sx * xh, yk, zk], { boring: 60, kap: false, opm: 'buis Ø70 x 12 E355 naadloos (binnen Ø46), uitgedraaid Ø60 H7 (wand 5 mm), Ra 1,6, voor 2 flensglijlagers GFM-5560-30; door beide lagerschilden gelast, na het lassen draaien (P1-04)' });
  }
  {
    // het lagerschild als paal: in het vlak (breed) en uit het vlak (2 platen op 50 mm), stapelkracht 2 x G op de as (helft per kant)
    const F = 1.5 * NOK_TAKEL * G * 9.81 / 2, hS = zk - a, bS = 300, Win = (2 * Ps * bS * bS) / 6, I = 2 * ((bS * Ps ** 3) / 12 + bS * Ps * 25 * 25), Wout = I / 30;
    const sig = (0.5 * F * hS) / Win + (F * 300) / Wout;
    b.toets('Sterkte', 'Lagerschild (2 x 10 mm) als paal: buiging in en uit het vlak', `F = 1,5 · 2 · ${G} kg · g / 2 = ${(F / 1000).toFixed(2)} kN per kant; in het vlak 50 % horizontaal op ${Math.round(hS)} mm: σ = ${((0.5 * F * hS) / Win).toFixed(0)} N/mm²; uit het vlak excentriciteit 300 mm (AANNAME, zoals de vroegere lagerpaal): σ = ${((F * 300) / Wout).toFixed(0)} N/mm²; samen ${sig.toFixed(0)} ≤ 235`, sig / 235, 'EN 1993-1-1 §6.2.5 (doorsnede aan de voet, 2 platen 300 x 10)');
  }
  b.groep('Hefboom');
  const th = sg * thMax * b.stand, rot = (p) => { const dy = p[1] - yk, dz = p[2] - zk; return [p[0], yk + dy * Math.cos(th) - dz * Math.sin(th), zk + dy * Math.sin(th) + dz * Math.cos(th)]; }, rotD = (d) => sub(rot(add([0, yk, zk], d)), [0, yk, zk]);
  const as = b.staaf('As hefboom', 'r55', [-(xh - 1), yk, zk], [xh - 1, yk, zk], { kap: false, in: 'lagerhuis', opm: `rond Ø${Pas.b} h9 S355J2+C (lasbaar: nok en instelschijf worden erop gelast), in 2 lagerhuizen; stelringen DIN 705 buiten de huizen` });
  // nok als segment: de raaklijn ligt op hoek a0 (0 = +y, π = -y); het opgewikkelde stuk ligt achter het raakpunt
  const a0 = sg > 0 ? 0 : Math.PI, m0 = a0 + sg * rad(20), m1 = a0 - sg * (thMax + rad(15)), N = 14;
  const boog = Array.from({ length: N + 1 }, (_, i) => m0 + ((m1 - m0) * i) / N).map((m) => [Rn * Math.cos(m + th), Rn * Math.sin(m + th), 0]);
  // N-P1-04 v7: een radiale stopkant aan het einde van het segment (m1): daar rust de nok in stand 0 tegen de aanslagbout
  const dH = 2 * Math.PI - Math.abs(m0 - m1), naaf = [0, 1, 2, 3, 4].map((i) => m1 - (sg * dH * i) / 5).map((m) => (i0(m) ? [60 * Math.cos(m + th), 60 * Math.sin(m + th), 0] : [90 * Math.cos(m + th), 90 * Math.sin(m + th), 25]));
  function i0(m) { return Math.abs(m - m1) < 1e-9; }
  const nokPts = sg > 0 ? [...boog, ...naaf].reverse() : [...boog, ...naaf];
  const nok = b.contour(`Nok (R${Rn})`, [xl, yk, zk], Y, [0, 0, 1], 12, nokPts, { in: as.id, banden: 10, gaten: [{ x: 0, y: 0, d: Pas.b, zitting: true }], opm: `nokschijf (segment) R${Rn} x 12, 2 platen + tussenring met kabelgroef Ø8 (R4,5), op de as gelast; segment over ${Math.round((thMax * 180) / Math.PI + 35)}°, radiale stopkant tegen de aanslagbout` });
  const rolArm = V.id === 'thuis' ? 'o80x40x3' : 'o100x50x3', Pa0 = b.P(rolArm), xmax = xh - 70 - Pa0.b / 2 - 8 - 24; // P3-01 v6: armen in vlakovaal; v7: plaats voor de instelschijf
  // N-P2-13 v7 (P2-03): bij een rol is de arm langer dan de rolpositie: de rol zit op een slede met een veerpen in 5 gaten
  // (L 340-440 mm om de 33 mm), zo past de machine bij korte en lange benen
  const rolL = c.einde === 'rol' ? [340, 373, 407, 440] : [];
  const armen = c.armen.map((a0_) => {
    const a = { ...a0_, x: Math.sign(a0_.x) * Math.min(Math.abs(a0_.x), xmax) || a0_.x }, e = [a.x, yk + a.naar[0], zk + a.naar[1]], La = Math.hypot(...a.naar), Lend = rolL.length ? Math.max(La, 440) + 40 : La, u = [0, a.naar[0] / La, a.naar[1] / La];
    return { a, e, d: b.staaf('Hefboomarm', rolArm, rot(add([a.x, yk, zk], mul(u, 62))), rot(add([a.x, yk, zk], mul(u, Lend))), { v: X, gaten: [{ s: 110 - 62, d: V.gat, as: 'v' }, ...rolL.map((s2) => ({ s: s2 - 62, d: V.gat, as: 'v' }))], opm: `vlakovaalbuis; gat Ø${V.gat} op 110 mm van de as voor de veerpen van de startstand${rolL.length ? `; 4 gaten op ${rolL.join('/')} mm voor de rolslede` : ''}` }) };
  });
  for (const ar of armen) ar.d.geenLasMet = ['As hefboom', 'Armbus'];
  const e0 = armen[0].e;
  // N-P1-04 v7: startstand echt verstelbaar. De arm zit op een armbus die VRIJ op de as draait (glijbus); naast de bus zit
  // een instelschijf die op de as GELAST is (met de nok). Een veerpen door de arm in een gat van de schijf koppelt arm en as:
  // een ander gat = een andere starthoek van de arm, terwijl de nok (en de stapel) op hun aanslag blijven.
  // twee losse armen met elk een greep: elk een eigen schijf en pen; armen die aan elkaar vastzitten (dwarsgreep, kussen): één pen
  const gepind = c.einde === 'greep' && armen.length > 1 ? armen : [armen.reduce((m, x) => (Math.abs(x.a.x) > Math.abs(m.a.x) ? x : m), armen[0])];
  // één arm (beenmachines): de schijf staat naast het rechter lagerhuis, buiten de zitting; de armbus loopt door tot een penarm
  const enkel = armen.length === 1, xsE = xh - 70 - 13;
  for (const { a } of armen) { const x1 = enkel ? xsE - 7 : a.x + 35; const bus = b.staaf('Armbus', 'b70x12', [a.x - 35, yk, zk], [x1, yk, zk], { in: as.id, boring: 60, kap: false, opm: `buis Ø70 x 12 E355 (binnen Ø46) uitgedraaid Ø60 H7, ${Math.round(x1 - a.x + 25)} mm; draait VRIJ op de as op glijbussen iglidur GSM-5560-50; de hefboomarm${enkel ? ' en de penarm' : ''} rond de bus gelast; niet aan de as gelast` }); bus.geenLasMet = ['As hefboom']; }
  // N-P2-13 v7 (P2-18): de vlakovaal arm hangt tussen twee naafplaten 8 mm die op de armbus gelast zijn (geen buis dwars
  // door de ronding van de ovaal); de arm begint 62 mm uit de as
  for (const { a } of armen) {
    const La = Math.hypot(...a.naar), m = Math.atan2(a.naar[1], a.naar[0]) + th, c0 = [Math.cos(m), Math.sin(m)], nr = [-c0[1], c0[0]], hb = Pa0.h / 2 + 15;
    const pts = [...Array.from({ length: 9 }, (_, i) => m + Math.PI / 2 + (Math.PI * i) / 8).map((q) => [46 * Math.cos(q), 46 * Math.sin(q)]), [160 * c0[0] - hb * nr[0], 160 * c0[1] - hb * nr[1], 20], [160 * c0[0] + hb * nr[0], 160 * c0[1] + hb * nr[1], 20]];
    for (const sx of [-1, 1]) b.contour('Naafplaat arm', [a.x + sx * (Pa0.b / 2 + 4), yk, zk], Y, [0, 0, 1], 8, pts, { in: as.id, banden: 6, gaten: [{ x: 0, y: 0, d: 70.5, zitting: true }, { x: 110 * c0[0], y: 110 * c0[1], d: V.gat }], opm: 'naafplaat 8 mm, rond de armbus gelast; de vlakovaal arm ertussen gelast (vlakke zijden)' });
    void La;
  }
  b.koop('glij55s', enkel ? 2 : armen.length, [], { naam: 'Glijbus GSM-5560-50 in de armbus (de arm draait vrij op de as)' });
  const Rs = 150, Rp = 110, alfa = (a) => Math.atan2(a.naar[1], a.naar[0]);
  for (const { a } of gepind) {
    const s = enkel ? 1 : Math.sign(a.x) || 1, xs2 = enkel ? xsE : a.x + s * (35 + 2 + 5), al = alfa(a);
    if (enkel) {
      // penarm 12 mm op het einde van de armbus: draagt de veerpen naar de instelschijf
      const hoekP = (m) => [Math.cos(m), Math.sin(m)], c0 = hoekP(al + th), nrm = [-c0[1], c0[0]];
      const pts = [...Array.from({ length: 9 }, (_, i) => al + th + Math.PI / 2 + (Math.PI * i) / 8).map((m) => [60 * Math.cos(m), 60 * Math.sin(m)]), [(Rp + 42) * c0[0] - 42 * nrm[0], (Rp + 42) * c0[1] - 42 * nrm[1], 30], [(Rp + 42) * c0[0] + 42 * nrm[0], (Rp + 42) * c0[1] + 42 * nrm[1], 30]];
      b.contour('Penarm', [xs2 - 13, yk, zk], Y, [0, 0, 1], 12, pts, { in: as.id, banden: 6, gaten: [{ x: 0, y: 0, d: 70.5, zitting: true }, { x: Rp * c0[0], y: Rp * c0[1], d: V.gat }], opm: `penarm 12 mm rond de armbus gelast: de veerpen op R${Rp} gaat erdoor in de instelschijf` });
    }
    b.contour('Instelschijf', [xs2, yk, zk], Y, [0, 0, 1], 10, cirkelPunten(0, 0, Rs, 36), { in: as.id, banden: 8, gaten: [{ x: 0, y: 0, d: Pas.b, zitting: true }, ...Array.from({ length: 6 }, (_, i) => { const t2 = al + th + rad(20 * (i - 3)); return { x: Rp * Math.cos(t2), y: Rp * Math.sin(t2), d: V.gat }; })], opm: `instelschijf Ø${2 * Rs} x 10, op de as gelast (a4 rondom); 6 gaten Ø${V.gat} om de 20° op R${Rp}: startstand van de arm met de veerpen` });
    const pp = rot([xs2 - s * (enkel ? 13 : 20), yk + Rp * Math.cos(al), zk + Rp * Math.sin(al)]);
    b.pen(`Veerpen startstand ${s < 0 ? 'L' : 'R'}`, pp, X, { d: V.pin, key: V.pin25, snedes: 1, t: 10, a: 'Hefboom', b: 'Hefboom', uit: [s * 120, 0, 0], F: ((NOK_TAKEL * G * Rn) / Rp) / gepind.length, factor: 'extrinsiekPen', lengte: 60 });
  }
  if (c.einde === 'rol') {
    const ar = armen[0], La = Math.hypot(...ar.a.naar), u = [0, ar.a.naar[0] / La, ar.a.naar[1] / La], Ls = rolL.reduce((m, x) => (Math.abs(x - La) < Math.abs(m - La) ? x : m), rolL[0]);
    const sl = V.id === 'thuis' ? 'o100x50x3' : 'o120x60x3', ps = (d) => rot(add([ar.a.x, yk, zk], mul(u, Ls + d)));
    b.staaf('Rolslede', sl, ps(-40), ps(40), { v: X, in: ar.d.id, kap: false, gaten: [{ s: 40, d: V.gat, as: 'v' }], opm: `vlakovaalbuis ${sl.slice(1)} 80 mm, schuift over de arm (PE-glijstrips 2 mm): de rol op ${rolL.join(' / ')} mm van de as met een veerpen; nu op ${Ls} mm` });
    b.koop(V.pin25, 1, [], { naam: 'Veerpen rolslede (lengte van de rolarm)' });
    b.staaf('As rol', 'as', rot([-200, e0[1], e0[2]]), rot([200, e0[1], e0[2]]), { kap: false, in: armen[0].d.id });
    b.koop(V.schuimrol, 2, [-1, 1].map((s2) => balk(rot([s2 * 30, e0[1], e0[2]]), rot([s2 * 180, e0[1], e0[2]]), X, 100, 100, true, 'leer')), { naam: 'Schuimrol Ø100' });
  } else if (c.einde === 'greep') for (const { a, e } of armen) { const s = Math.sign(a.x) || 1; b.staaf('Greep', 'greep', rot([a.x - s * (Pa0.b / 2 - 1), e[1], e[2]]), rot([s * 130, e[1] + (c.greepSchuin ?? 0), e[2] + (c.greepSchuin ?? 0)]), { opm: 'met rubber handvat; schuin naar binnen (ergonomisch)' }); }
  else if (c.einde === 'dwars') b.staaf('Greep', 'greep', rot([armen[0].a.x + Math.sign(-armen[0].a.x) * (Pa0.b / 2 - 0.5), e0[1], e0[2]]), rot([armen[armen.length - 1].a.x - Math.sign(armen[armen.length - 1].a.x) * (Pa0.b / 2 - 0.5), e0[1], e0[2]]), { opm: 'dwarsgreep tussen de armen, rubber handvat' });
  else if (c.einde === 'kussen') { const nn = norm(rotD(c.kussenN ?? [0, -1, 0])), xa = Math.abs(armen[0].a.x) - Pa0.b / 2 + 0.5, pl = b.staaf('Kussenligger arm', rolArm, rot([-xa, e0[1], e0[2]]), rot([xa, e0[1], e0[2]]), { v: nn, kap: true }), h0 = pl.P.b / 2 + 0.5; b.kussen('Armkussen', add(rot([-160, e0[1], e0[2]]), mul(nn, h0)), add(rot([160, e0[1], e0[2]]), mul(nn, h0)), nn, 220, 60); }
  b.groep('frame');
  b.koop('glij55', 4, [], { naam: 'Flensglijlager GFM-5560-30 in de 2 lagerhuizen (2 per huis)' });
  b.koop('stelring55', 2 + 2 * armen.length, [], { naam: 'Stelring DIN 705 Ø55: as in de lagerhuizen en de armbussen opzij' });
  for (const sx of [-1, 1]) b.pen(`As hefboom in het lagerhuis ${sx < 0 ? 'L' : 'R'}`, [sx * (xh - 35), yk, zk], X, { d: Pas.b, lengte: 58, snedes: 1, t: 10, a: 'frame', b: 'Hefboom', uit: [-200, 0, 0], F: NOK_TAKEL * G * 0.6, factor: 'extrinsiekPen', gelast: 'As hefboom' });
  const kracht = (NOK_TAKEL * G * Rn) / L;
  {
    // as: buiging (kabel aan de nok + armkracht) en torsie (kabelkracht x Rn), von Mises (P2-01)
    const kf = 2.5, Fc = kf * 1.5 * NOK_TAKEL * G * 9.81, Ls = 2 * (xh - 35), xc = xl + Ls / 2, M = (Fc * xc * (Ls - xc)) / Ls * 1.6, W = (Math.PI * Pas.b ** 3) / 32, Tt = Fc * Rn, tau = Tt / (2 * W), sv = Math.hypot(M / W, Math.sqrt(3) * tau);
    b.toets('Sterkte', 'As van de hefboom: buiging en torsie (2 lagers)', `proeflast kabel ${kf} · 1,5 · ${NOK_TAKEL} x ${G} kg · g = ${(Fc / 1000).toFixed(2)} kN aan de nok, armkracht erbij (x 1,6, AANNAME); overspanning ${Ls} mm: M ≤ ${(M / 1e6).toFixed(3)} kNm, σ = ${(M / W).toFixed(0)} N/mm²; torsie T = F·R = ${(Tt / 1e6).toFixed(2)} kNm, τ = T/Wp = ${tau.toFixed(0)} N/mm²; σv = √(σ² + 3τ²) = ${sv.toFixed(0)} N/mm² ≤ fy = ${Pas.fy ?? 235} (${Pas.naam})`, sv / (Pas.fy ?? 235), 'EN 1993-1-1 §6.2.5 en §6.2.7 (as op 2 steunpunten, von Mises)');
    { const aw = 6, rw = Pas.b / 2, Tq = Fc * Rn, tw = Tq / (2 * Math.PI * rw * rw * aw); b.toets('Lassen', 'Las nok op de as (torsie)', `hoeklas a${aw} rondom Ø${Pas.b}: τ = T / (2·π·r²·a) = ${(Tq / 1e6).toFixed(2).replace('.', ',')} kNm / (2·π·${rw}²·${aw}) = ${tw.toFixed(0)} N/mm² ≤ fvw,d = 208`, tw / 208, 'EN 1993-1-8 §4.5.3 (vereenvoudigd)'); }
    b.toets('Krachtsverhouding', `Nok: kracht aan ${c.einde === 'rol' ? 'de rol' : c.einde === 'kussen' ? 'het kussen' : 'de greep'} tegenover de stapel`, `2:1-takel x nok R${Rn} / arm ${Math.round(L)} mm = ${((NOK_TAKEL * Rn / L) * 100).toFixed(0)} % van de stapel (${G} kg): ${Math.round(kracht)} kg aan het einde van de arm ≥ grens ${Math.round(grens)} kg (${c.oef ?? 'druk'}, ${V.naam.toLowerCase()}); stapelweg 2·R·θ = ${slag} mm bij ${Math.round((thMax * 180) / Math.PI)}°; greepweg L·θ = ${Math.round(L * thMax)} mm`, grens / kracht, `grens: ${NOKGRENS_BRON[c.oef ?? 'druk']}; hefboomwet`, { oordeel: kracht >= grens ? 'groen' : 'rood' }); // een eis (≥ grens), geen sterkte: geen oranje zone
  }
  b.o.nok = { Rn, L, G, kracht, grens, slag, greepweg: Math.round(L * thMax), oef: c.oef ?? 'druk', zin: sg, as: [yk, zk], thMax, factor: NOK_TAKEL };
  // vloerkatrol C onder het raakpunt (Rema RZ-1.0): de nokkabel komt van de toren over de vloer en gaat aan de voorkant van C recht omhoog
  const pf = katrolBeugel(b, 'C (vloer, onder de nok)', [xl, yf, zf], X, { kap: 'ligger', key: NOK_SCHIJF.nok }); pf.kapTekst = 'in de gesloten nokkap';
  const vrij = (y0, y1) => (y1 > yk - P.b / 2 - 1 && y0 < yk + P.b / 2 + 1 ? (yf < yk ? [y0, yk - P.b / 2 - 1] : [yk + P.b / 2 + 1, y1]) : [y0, y1]), [cy0, cy1] = vrij(yf - 40, yf + 40); // niet in de dwarsvoet van de lagerpalen
  b.plaat('Console vloerkatrol', [xl + 24, cy0, zf - rn - 25 - 10], [-P.b / 2, cy1, zf - rn - 25], { opm: 'plaat 10 mm: verbindt de katrolbeugel met de vloerligger' });
  // ---- 2:1-takel achter de toren (N-P1-01 v7): A en B boven, losse katrol L op een geleid blok, D onderaan; alles in een koker
  const zA = T.H - aT - 15 - rs, yA = T.yt + rs, yB = yA + 2 * rs + 2 * 25 + 10, yL = yB + 2 * rs, yP = yL - rn, yAnk = yL + rs, yE = yAnk + 50;
  const du = Math.round(Rn * Math.abs(th)), zL0 = zA - 2 * rs - 70, zL = zL0 - du, zJ = zL - rs - 42, zOog = zJ - 12 - 20;
  const arm = b.staaf('Takelarm', 'toren', [xl, T.yt + aT / 2, T.H - aT / 2], [xl, yE, T.H - aT / 2], { opm: 'koker achter de toren, tegen de bovenligger gelast: draagt de katrol B, het anker van de stapelkabel en de geleidestangen' });
  // de voetlus achter: zijligger links (achter de torenvoet), rechts verlengd, en een achterligger achter de takelkoker
  const yR = yE + 40;
  b.staaf('Voetlus achter L', 'ligger', [-XR, T.yt + 300, a / 2], [-XR, yR - a / 2, a / 2], { opm: 'koker in de lijn van de linker torenvoet, tot de achterligger' });
  b.staaf('Voetlus achter R', 'ligger', [XR, T.yt + 300, a / 2], [XR, yR - a / 2, a / 2], { opm: 'koker in het verlengde van de voetlus' });
  b.staaf('Voetlus achterligger', 'ligger', [-XR - a / 2, yR, a / 2], [XR + a / 2, yR, a / 2], { opm: 'koker: sluit de voetlus achter de takelkoker' });
  voetPunten(b, [[-XR, yR], [XR, yR]], 'de achterligger');
  const tv = b.staaf('Takelvoet', 'toren', [xl, T.yt + 100 + aT / 2, aT / 2], [xl, yR - a / 2, aT / 2], { opm: 'koker op de vloer achter de toren, tussen de achterligger van de toren en die van de voetlus: draagt de katrol D en de geleidestangen' }); void tv;
  const pa = katrolBeugel(b, 'A (boven de stapel)', [xl, yA, zA], X, { tot: { as: 2, w: T.H - aT }, kap: 'ligger', key: NOK_SCHIJF.stapel });
  const pb = katrolBeugel(b, 'B (achter de toren)', [xl, yB, zA], X, { tot: { as: 2, w: T.H - aT }, kap: 'ligger', key: NOK_SCHIJF.stapel }); pb.kapTekst = 'in de gesloten takelkoker';
  const pd = katrolBeugel(b, 'D (onder het takelblok)', [xl, yP, zc + rn], X, { tot: { as: 2, w: aT }, kap: 'ligger', key: NOK_SCHIJF.nok }); pd.kapTekst = 'in de gesloten takelkoker';
  for (const sx of [-1, 1]) {
    b.plaat('Console geleiding onder', [xl + sx * 35, yL - 30, aT], [xl + sx * 75, yL + 30, aT + 12], { gaten: [{ p: [xl + sx * 55, yL, aT], d: 25, zitting: true }], opm: 'plaat 12 mm op de takelvoet gelast; geleidestang Ø25 erin geklemd (boring Ø25 H7 met klemspleet)' });
    b.plaat('Console geleiding boven', [xl + sx * 35, yL - 30, T.H - aT - 12], [xl + sx * 75, yL + 30, T.H - aT], { gaten: [{ p: [xl + sx * 55, yL, T.H - aT - 12], d: 25, zitting: true }], opm: 'plaat 12 mm onder de takelarm gelast (boring Ø25 H7 met klemspleet)' });
    b.koop('stang25', 1, [balk([xl + sx * 55, yL, aT + 12], [xl + sx * 55, yL, T.H - aT - 12], X, 25, 25, true, 'chroom')], { naam: `Geleidestang takelblok Ø25 h6, ${Math.round(T.H - 2 * aT - 24)} mm`, meter: Math.round(T.H - 2 * aT - 24) / 1000 });
  }
  b.plaat('Anker stapelkabel', [xl - 6, yAnk - 30, T.H - aT - 60], [xl + 6, yAnk + 30, T.H - aT], { gaten: [{ p: [xl, yAnk, T.H - aT - 30], d: 10.5 }], opm: 'ankerplaat 12 mm onder de takelarm: het vaste eind van de stapelkabel (kous + persklem + harpsluiting M10)' });
  b.groep('Takelblok');
  const pL = b.katrol('L (los, op het takelblok)', [xl, yL, zL], X, { kap: 'ligger', key: NOK_SCHIJF.stapel }); pL.kapTekst = 'in de gesloten takelkoker';
  for (const sx of [-1, 1]) b.plaat('Takelblok wang', [xl + sx * 18 - 3, yL - rs - 10, zJ], [xl + sx * 18 + 3, yL + rs + 10, zL + 25], { gaten: [{ p: [xl + sx * 18, yL, zL], d: 10.5 }], opm: 'wang 6 mm: draagt de as M10 van de losse katrol' });
  b.plaat('Takelblok juk', [xl - 80, yL - 35, zJ - 12], [xl + 80, yL + 35, zJ], { gaten: [{ p: [xl - 55, yL, zJ - 12], d: 40, zitting: true }, { p: [xl + 55, yL, zJ - 12], d: 40, zitting: true }, { p: [xl, yL, zJ - 12], d: 10.5 }], opm: 'juk 12 mm met 2 boringen Ø40 H7 voor de lineaire lagers: het blok loopt geleid op 2 stangen Ø25' });
  b.koop(V.lineair, 2, [-1, 1].map((sx) => balk([xl + sx * 55, yL, zJ - 12 - 23], [xl + sx * 55, yL, zJ + 23], X, 40, 40, true, 'chroom')), { naam: `${KOOP[V.lineair].naam} in het juk van het takelblok` });
  b.plaat('Takelblok oog', [xl - 6, yL - 20, zOog - 20], [xl + 6, yL + 20, zJ - 12], { gaten: [{ p: [xl, yL, zOog], d: 10.5 }], opm: 'oog 12 mm onder het juk, op de hartlijn van de schijf: de nokkabel trekt centrisch (geen moment op het blok)' });
  b.groep('frame');
  b.koop('kabelklem8', 4, [], { naam: 'Kabeleinden: kous + persklem + harpsluiting M10 (stapel, anker, takelblok, nok)' });
  b.kabel('Kabel stapel', [{ p: T.s.oog(xl + 155) }, pa, pb, pL, { p: [xl, yAnk, T.H - aT - 30] }], { key: NOK_KABEL.stapel, last: G, overbrenging: 1, slag, einde: 'anker' });
  b.kabel('Kabel nok', [{ p: [xl, yL, zOog] }, pd, pf, { p: [xl, yr, zk] }], { key: NOK_KABEL.nok, last: NOK_TAKEL * G, overbrenging: 1, slag: wik, begin: 'anker', einde: 'nok', opgewikkeld: du, raak: [xl, yr, zk] });
  b.o.knepen = b.o.knepen ?? []; for (const k of [pa, pb, pL, pd]) b.o.knepen.push({ naam: `katrol ${k.label}`, p: k.c });
  {
    // toetsen van de takel: zijkracht op het blok (centrisch: 0), de takelarm als uitkrager, de top-aanslag via de kabel
    const Fk = NOK_TAKEL * G * 9.81, Larm = yE - T.yt - aT / 2, Parm = b.P('toren'), Marm = (G * 9.81 * (yB + rs - T.yt) + G * 9.81 * (yAnk - T.yt)) * 1.5, Wa = (Parm.b ** 4 - (Parm.b - 2 * Parm.t) ** 4) / (6 * Parm.b);
    b.toets('Sterkte', 'Takelarm achter de toren (uitkrager)', `stapelkabel aan B (${Math.round(yB + rs - T.yt)} mm) en aan het anker (${Math.round(yAnk - T.yt)} mm), elk G·g; x 1,5 dynamisch: M = ${(Marm / 1e6).toFixed(2)} kNm, σ = M/W = ${(Marm / Wa).toFixed(0)} N/mm² ≤ ${Parm.fy ?? 235} (${Parm.naam ?? 'koker'}, lengte ${Math.round(Larm)} mm)`, Marm / Wa / (Parm.fy ?? 235), 'EN 1993-1-1 §6.2.5');
    b.toets('Krachtsverhouding', 'Takelblok: centrische trek (geen kantelmoment)', `de nokkabel hangt op de hartlijn van de schijf (x = ${xl}, y = ${Math.round(yL)}); de twee strengen van de stapelkabel liggen op y = ${Math.round(yL - rs)} en ${Math.round(yL + rs)}: resultante op y = ${Math.round(yL)}; excentriciteit 0 mm (v6b: 57,5 mm, 158 Nm); het blok loopt op 2 lineaire lagers op stangen Ø25`, 0.05, 'statica; Fable 5.2 v6 N-P1-01');
    b.toets('Kabel', 'Aanslag boven: nokkabel als de gebruiker tegen de aanslag duwt', `bij stand 1 rust de stapel tegen de bovenbuffers; een duw van 1,5 x de grens extra geeft in de nokkabel ${((Fk * 1.5) / 1000).toFixed(2)} kN extra: 3 · ${((Fk * 2.5) / 1000).toFixed(2)} kN ≤ breukkracht ${KOOP[NOK_KABEL.nok].MBL} kN (veiligheid 3 bij overbelasting, AANNAME)`, (3 * Fk * 2.5) / 1000 / KOOP[NOK_KABEL.nok].MBL, `${KOOP[NOK_KABEL.nok].bron}`);
  }
  // ---- aanslagen (N-P1-04 v7): begin = de stopkant van de nok tegen een aanslagbout in de nokkap; einde = de stapel tegen
  // rubberbuffers op de geleidestangen (stand 1); de arm hangt via de veerpen vast aan de as, dus de arm stopt mee
  {
    const rB = Math.max(Rn - 35, (Rn + 60) / 2), dB = 30, phB = m1 - sg * Math.asin(dB / 2 / rB), pB = [xl, yk + rB * Math.cos(phB), zk + rB * Math.sin(phB)];
    b.koop('buffer', 1, [balk([xl - 40, pB[1], pB[2]], [xl + 40, pB[1], pB[2]], Y, dB, dB, true, 'rubber')], { naam: 'Aanslag begin: bout M12 met rubberhuls Ø30 door de nokkap (de stopkant van de nok rust ertegen in stand 0)' });
    b.o.aanslag = { begin: { p: pB, r: dB / 2 }, nok: nok.id };
    const s = T.s, zb = s.top + s.slag + 35 + (s.dz ? -s.dz : 0);
    for (const sx of [-1, 1]) b.koop('buffer', 1, [balk([s.c[0] + sx * s.hoh / 2, s.c[1], zb], [s.c[0] + sx * s.hoh / 2, s.c[1], zb + 40], X, 50, 50, true, 'rubber')], { naam: 'Aanslag einde: rubberbuffer Ø50 op de geleidestang, op een stelring DIN 705 (de lagerbus van de stapel raakt hem in stand 1)' });
    b.koop('stelring25', 2, [], { naam: 'Stelring DIN 705 Ø25 boven de aanslagbuffers' });
    b.o.aanslag.einde = { z: zb };
  }
  b.groep('Afscherming nok');
  nokKappen(b, { xl, yk, zk, Rn, m0, m1, sg, thMax, rn, yf, zf, zc, aT, T, yr });
  b.groep('frame');
  station(b, vl, c.station ?? [], Pb, P);
  b.groep('Afscherming nok');
  vloerGoot(b, { xl, yf, rn, zc, T, aT });
  takelKoker(b, { xl, T, aT, yE });
  b.groep('frame');
  b.reken('Hefboomarm (kracht aan het einde)', armen[0].d, 'uitkrager', L, 0, { g: (NOK_TAKEL * G * Rn) / L / armen.length, proef: 'extrinsiek', las: true, dwars: true });
  b.last('Gebruiker', 100, [0, yk + (c.gebruiker ?? 230), 800], { geval: 'station' }); b.last('Stapel hoog', G, [0, T.yt, 1000], { geval: 'station' });
  void isPro; void gewicht; void arm; void bovenKatrol; void onderKatrol;
}

/** convexe omhullende (y, z) van punten (monotone keten), tegen de klok in */
function omhul(pts) {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]), kr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], hi = [];
  for (const q of p) { while (lo.length >= 2 && kr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of [...p].reverse()) { while (hi.length >= 2 && kr(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop(); hi.push(q); }
  return [...lo.slice(0, -1), ...hi.slice(0, -1)];
}
/**
 * N-P1-02 v7: één gesloten nokkap rond de nok, de verticale nokkabel en de vloerkatrol C: twee gelaserde zijplaten met de
 * omhullende als contour en een gezette rand rondom (één strook, stapbuigen), alleen een gat voor de as. De kabel gaat aan
 * de onderkant over in de vloergoot naar de toren. Registreert de kap en de inlopende knepen voor kapFouten.
 */
export function nokKappen(b, { xl, yk, zk, Rn, m0, m1, sg, thMax, rn, yf, zf, zc, aT, yr }) {
  const o = b.o, t = 1.5, bk = 32, lo = Math.min(m0, m1) + Math.min(0, sg * thMax) - rad(8), hi = Math.max(m0, m1) + Math.max(0, sg * thMax) + rad(8);
  const pts = [
    ...Array.from({ length: 17 }, (_, i) => lo + ((hi - lo) * i) / 16).map((m) => [yk + (Rn + 25) * Math.cos(m), zk + (Rn + 25) * Math.sin(m)]),
    ...Array.from({ length: 16 }, (_, i) => (2 * Math.PI * i) / 16).map((m) => [yk + 130 * Math.cos(m), zk + 130 * Math.sin(m)]),
    ...Array.from({ length: 16 }, (_, i) => (2 * Math.PI * i) / 16).map((m) => [yf + (rn + 40) * Math.cos(m), zf + (rn + 40) * Math.sin(m)]),
  ];
  const zmin = aT + 2;
  let poly = omhul(pts).map(([y, z]) => [Math.round(y * 10) / 10, Math.round(Math.max(zmin, z) * 10) / 10]);
  poly = poly.filter((p, i) => { const q = poly[(i + 1) % poly.length]; return Math.hypot(p[0] - q[0], p[1] - q[1]) > 4; });
  const zij = [];
  for (const [nm, x] of [['Nokkap buiten', xl - bk], ['Nokkap binnen', xl + bk]]) zij.push(b.contour(nm, [x, 0, 0], [0, 1, 0], [0, 0, 1], t, poly.map(([y, z]) => [y, z, 0]), { kleur: 'kap', banden: 10, gaten: [{ x: yk, y: zk, d: 51 }], opm: 'zijplaat 1,5 mm DC01, gelaserd (de DXF is de echte vorm), gat Ø51 voor de as; met 12 klinkmoeren M5 aan de rand' }));
  // de rand: twee stroken 1,5 mm (elk ≤ 3 m), breedte = afstand tussen de zijplaten + 2 x 1,5, gezet op elke hoek van de omhullende
  const W = 2 * bk + 2 * t, ribben = poly.map((p, i) => { const q = poly[(i + 1) % poly.length]; return { p, q, lg: Math.hypot(q[0] - p[0], q[1] - p[1]) }; });
  const totaal = ribben.reduce((tt, r) => tt + r.lg, 0), nS = Math.max(2, Math.ceil(totaal / 2800)), delen = Array.from({ length: nS }, () => []); let acc = 0;
  for (const r of ribben) { delen[Math.min(nS - 1, Math.floor((acc + r.lg / 2) / (totaal / nS)))].push(r); acc += r.lg; }
  for (const [nm, deel] of delen.map((d, i) => [`Nokkap rand ${i + 1}`, d]).filter(([, d]) => d.length)) {
    const kind = [], zl = []; let s = 0;
    deel.forEach((r, i) => {
      const dy = r.q[0] - r.p[0], dz = r.q[1] - r.p[1], ex = [0, dy / r.lg, dz / r.lg];
      kind.push(b.contour(nm, [xl - bk - t, r.p[0], r.p[1]], ex, [1, 0, 0], t, [[0, 0], [r.lg, 0], [r.lg, W], [0, W]], { kleur: 'kap', banden: 1, opm: 'rand van de nokkap (deel van de gezette strook)' }));
      s += r.lg;
      const v = deel[i + 1]; if (!v) return;
      const d2 = [v.q[0] - v.p[0], v.q[1] - v.p[1]], hoek = (Math.acos(Math.max(-1, Math.min(1, (dy * d2[0] + dz * d2[1]) / (r.lg * v.lg)))) * 180) / Math.PI;
      if (hoek > 0.5) zl.push({ a: [s, 0], b: [s, W], hoek: Math.round(hoek * 10) / 10, R: 3, richting: 'op', ba: 0 });
    });
    b.gezet(nm, kind, { t, uitslag: { punten: [[0, 0], [s, 0], [s, W], [0, W]], zetlijnen: zl }, opm: `rand 1,5 mm DC01 van de nokkap (helft): strook ${Math.round(s)} x ${Math.round(W)}, ${zl.length} zettingen (stapbuigen, Ri 3) volgens de hoeken van de zijplaten; met klinkmoeren M5 aan de zijplaten; naden op 2 hoeken` });
  }
  b.koop('kapM6', 2, [], { naam: 'Bevestigingsset nokkap (16 x M5 klinkmoer + inbus) en de bevestiging aan de lagerpaal (4 x M6)', groep: 'afwerking' });
  o.kappen = o.kappen ?? []; o.knepen = o.knepen ?? [];
  o.kappen.push({ naam: 'Nokkap', x: [xl - bk - t, xl + bk + t], poly, gesloten: true, openingen: [{ wat: 'as Ø45 in gat Ø51', mm: 3, p: [xl - bk, yk, zk] }, { wat: 'aansluiting vloergoot (afgedekt)', mm: 0, p: [xl, yf + rn, zc] }] });
  o.knepen.push({ naam: 'nokkabel loopt op de nok', p: [xl, yr, zk] }, { naam: 'nokkabel op katrol C', p: [xl, yf - rn, zf] }, { naam: 'nokkabel van katrol C', p: [xl, yf, zc] });
  void zij;
}
/** N-P2-05 v7: lage vloergoot in traanplaat 3 mm (betreedbaar) over de nokkabel van de nokkap tot de toren; de benen
 *  springen in boven liggers die de goot kruist */
export function vloerGoot(b, { xl, yf, rn, zc, T, aT, tot = null }) {
  const o = b.o, tg = 3, zg = zc + 22, w = 60, y0 = yf + rn + 30, y1 = tot ?? T.yt - T.dpl / 2 - 22 - 2;
  if (y1 - y0 < 20) return;
  const hind = o.delen.filter((d) => d.kleur !== 'kap' && !d.deelVan && d.mn && d.mx[0] > xl - w / 2 - 1 && d.mn[0] < xl + w / 2 + 1 && d.mn[2] < zg && d.mx[1] > y0 && d.mn[1] < y1 && d.mn[2] < 5)
    .map((d) => [Math.max(y0, d.mn[1] - 2), Math.min(y1, d.mx[1] + 2), d.mx[2] + 2]).sort((p, q) => p[0] - q[0]);
  const top = b.plaat('Vloergoot', [xl - w / 2, y0, zg - tg], [xl + w / 2, y1, zg], { kleur: 'kap', opm: 'bovenvlak van de vloergoot (traanplaat 3 mm)' }), kind = [top];
  for (const sx of [-1, 1]) {
    let y = y0;
    for (const [a, bb, h] of [...hind, [y1, y1, 0]]) {
      if (a > y + 1) kind.push(b.plaat('Vloergoot', [xl + sx * w / 2 - (sx > 0 ? tg : 0), y, 0], [xl + sx * w / 2 + (sx < 0 ? tg : 0), a, zg - tg], { kleur: 'kap', opm: 'been van de vloergoot' }));
      if (bb > a && h < zg - tg - 5) kind.push(b.plaat('Vloergoot', [xl + sx * w / 2 - (sx > 0 ? tg : 0), a, h], [xl + sx * w / 2 + (sx < 0 ? tg : 0), bb, zg - tg], { kleur: 'kap', opm: 'been van de vloergoot (ingesprongen boven een ligger)' }));
      y = Math.max(y, bb);
    }
  }
  const ui = uitslagStrook(y1 - y0, [zg, w, zg], [{ hoek: 90, R: 2 * tg, richting: 'neer' }, { hoek: 90, R: 2 * tg, richting: 'neer' }], tg);
  // de inspringingen boven de liggers als uitsparingen aan de vrije randen van de benen
  const pts = [[0, 0]];
  for (const [a, bb, h] of hind) pts.push([a - y0, 0], [a - y0, h], [bb - y0, h], [bb - y0, 0]);
  pts.push([y1 - y0, 0], [y1 - y0, ui.B]);
  for (const [a, bb, h] of [...hind].reverse()) pts.push([bb - y0, ui.B], [bb - y0, ui.B - h], [a - y0, ui.B - h], [a - y0, ui.B]);
  pts.push([0, ui.B]);
  b.gezet('Vloergoot', kind, { t: tg, uitslag: { ...ui, punten: pts }, maat3d: [zg, w, zg], opm: `vloergoot traanplaat 3 mm (betreedbaar, AANNAME 150 kg op 60 mm breed): U ${w} x ${zg} omgekeerd, 2 zettingen 90° Ri 6; ${hind.length} inspringing(en) boven liggers; met 4 x M6 aan de nokkap en de toren` });
  o.kappen = o.kappen ?? []; o.kappen.push({ naam: 'Vloergoot', box: [[xl - w / 2, y0 - 25, 0], [xl + w / 2, y1 + 3, zg]], gesloten: true, openingen: [] });
  void aT;
}
/** N-P1-01 v7: de gesloten takelkoker achter de toren (U gezet 1,5 mm + deksel), 6 mm boven de vloer */
function takelKoker(b, { xl, T, aT, yE }) {
  const o = b.o, t = 1.5, hx = 95, yb0 = T.yt + T.dpl / 2 + 22, y1 = yE + 20, z0 = 6, z1 = T.H + 25, d = y1 - yb0, Hk = z1 - z0;
  const kind = [
    b.contour('Takelkoker', [xl - hx + t / 2, 0, 0], [0, 1, 0], [0, 0, 1], t, [[yb0, z0], [y1, z0], [y1, z1], [yb0, z1]], { kleur: 'kap', banden: 4, opm: 'zijwand van de takelkoker' }),
    b.contour('Takelkoker', [xl + hx - t / 2, 0, 0], [0, 1, 0], [0, 0, 1], t, [[yb0, z0], [y1, z0], [y1, z1], [yb0, z1]], { kleur: 'kap', banden: 4, opm: 'zijwand van de takelkoker' }),
    b.contour('Takelkoker', [0, y1 - t / 2, 0], [1, 0, 0], [0, 0, 1], t, [[xl - hx, z0], [xl + hx, z0], [xl + hx, z1], [xl - hx, z1]], { kleur: 'kap', banden: 4, opm: 'achterwand van de takelkoker' }),
  ];
  b.gezet('Takelkoker', kind, { t, uitslag: uitslagStrook(Hk, [d, 2 * hx, d], [{ hoek: 90, R: 3, richting: 'op' }, { hoek: 90, R: 3, richting: 'op' }], t), maat3d: [d, 2 * hx, d], opm: `takelkoker 1,5 mm DC01, U ${Math.round(d)} x ${2 * hx} x ${Math.round(Hk)}, 2 zettingen 90° Ri 3; tegen de achterkap van de toren met 10 x M6 (afneembaar voor onderhoud); RAL zoals de toren` });
  b.plaat('Takelkoker deksel', [xl - hx, yb0, z1], [xl + hx, y1, z1 + 2], { kleur: 'kap', opm: 'deksel 2 mm op de takelkoker, met 4 x M6' });
  o.kappen = o.kappen ?? []; o.kappen.push({ naam: 'Takelkoker', box: [[xl - hx, yb0 - 160, 0], [xl + hx, y1, z1 + 2]], gesloten: true, openingen: [{ wat: 'spleet onder de koker', mm: z0, p: [xl, y1, z0 / 2] }] });
  void aT;
}

/**
 * kabelstation: toren met een gebogen arm naar voren (bovenroute, katrol B op afstand yb) en een lage katrol vooraan de
 * toren (onderroute); 1:1 met twee kabels, of 2:1 met één kabel en een losse katrol op de stapel (halve kracht). c = { yb, opB, zl (hoogte van de
 * greep boven), greep: 'lat' | 'touw', laagY (lage greep), station: [...], zit: [y, z] }
 */
export function kabelStation(b, def, c) {
  // 1:1 of 2:1 (P1-02 v6): 2:1 alleen als de halve stapel de grens van de oefening haalt, anders twee kabels 1:1 (boven en
  // laag, elk aan een eigen oog van de stapel); de stapelweg is de greepweg gedeeld door de overbrenging
  const n = kabelStapel(b), G = n * b.V.stapelKg, grens = NOKGRENS[c.oef ?? 'rug'] * (FV[b.V.id] ?? 1), ov = G / 2 >= grens ? 2 : 1, weg = c.weg ?? 700, slag = Math.round(weg / ov);
  const V = b.V, T = toren(b, { yt: c.yt ?? 1200, H: Math.max(c.H ?? 2150, 60 + 20 * n + slag + 420), ogen: ov === 1 ? [-60, 60] : [], n, slag }), r = T.r, a = T.a, yb = c.yb ?? 420;
  const Pb = b.P(b.V.id === 'thuis' ? 'o120x60x3' : 'o120x60x4'), zArm = T.H + 10 + Pb.h / 2, opB = c.opB ?? 120, yk = T.yt - a / 2 - 220;
  const arm = !opB ? b.staaf('Lat-arm', Pb.id, [-60, T.yt + a / 2, zArm], [-60, yb - 60, zArm], { v: X, opm: 'vlakovaalbuis, recht; op de bovenligger van de toren' }) : b.buis('Lat-arm', Pb.id, [[-60, T.yt + a / 2, zArm], [-60, yk, zArm], [-60, yb - 60, zArm + opB]], { vlak: X, opm: `vlakovaalbuis, 1 bocht R${3 * Pb.h}; op de bovenligger van de toren` });
  // v7 (P2-18): de vlakovaal arm ligt op een zadelplaat 10 mm op de bovenligger (geen las in de V-spleet van de ronding)
  b.plaat('Zadelplaat lat-arm', [-60 - Pb.b / 2 - 15, T.yt - a / 2, T.H], [-60 + Pb.b / 2 + 15, T.yt + a / 2, T.H + 10], { opm: 'zadelplaat 10 mm: op de bovenligger gelast, de vlakovaal arm erop (vlakke kant)' });
  for (const s2 of [-1, 1]) b.staaf('Schetsplaat lat-arm', 's60x10', [-60 + s2 * (Pb.b / 2 + 5), T.yt + a / 2, T.H + 40], [-60 + s2 * (Pb.b / 2 + 5), T.yt - a / 2 - 150, T.H + 40], { v: X, kap: false, opm: 'schetsplaat 60 x 10 naast de arm (vermoeiing)' });
  const pa = bovenKatrol(b, T, -60, 'voor', 'A (boven de stapel)');
  const pb = katrolBeugel(b, 'B (vooraan de arm)', [-60, yb, T.H - 15 - r], X, { tot: { as: 2, w: T.H + opB * ((yk - yb) / (yk - yb + 60)) - 4 }, kap: false });
  // v8: C draait de kabel 180° (2 x de kabelkracht): een stalen Rema RZ-0.5 (4,9 kN) in plaats van de alu fitnesskatrol (3 kN)
  const rC = KOOP.rz05.D / 2, pc = katrolBeugel(b, 'C (laag, boven de stapel)', [60, T.yt - rC, T.H - T.a - 15 - rC], X, { tot: { as: 2, w: T.H - T.a }, kap: 'ligger', key: 'rz05' }), pd = onderKatrol(b, T, 60, 'D (laag, onderaan)');
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
  b.toets('Krachtsverhouding', `Kabelstation: kracht aan de greep (${ov}:1)`, `stapel ${G} kg, overbrenging ${ov}:1: ${Math.round(kracht)} kg aan de greep ≥ grens ${Math.round(grens)} kg (${c.oef ?? 'rug'}, ${V.naam.toLowerCase()}); stapelweg ${slag} mm bij ${weg} mm greepweg`, grens / kracht, `grens: ${NOKGRENS_BRON[c.oef ?? 'rug']}`, { oordeel: kracht >= grens ? 'groen' : 'rood' });
  b.o.kracht = { kracht, grens, oef: c.oef ?? 'rug', overbrenging: ov };
  const { vl } = vloer(b, T);
  station(b, vl, c.station ?? [], b.P('bank'), b.P('ligger'));
  b.reken('Lat-arm (uitkragend, kabel over 90°: 1,41 x de kabelkracht)', arm, 'uitkrager', T.yt - yb, 0, { g: 1.41 * G, proef: 'extrinsiek', las: true });
  b.reken('Torenstaander', T.sL, 'staander', T.H - a, 0, { g: 3 * G, proef: 'extrinsiek' });
  b.last('Gebruiker in het station', 100, [0, yb + 200, 700], { geval: 'kabel' }); b.last('Stapel (hoogste stand)', G, [0, T.yt, T.s.top + T.s.slag - 150], { geval: 'kabel' });
}

/**
 * ruggengraat (v8): één vlakovaal die over de vloerligger loopt en met één bocht R150 omhoog gaat tot boven de rugleuning.
 * De zitting zit op een slede (vlakovaal één maat groter) die over het staande deel schuift, met een veerpen in 4 gaten
 * om de 45 mm (zithoogte); de rugleuning zit op het bovenste deel.
 */
function ruggengraat(b, vl, zit, rug, P) {
  const Po = b.P('bankO'), Pl = b.P('bankLicht'), [ys, z] = zit.zit, lang = zit.lang ?? 340, breed = zit.breed ?? 320, yr = rug.rug[0], R = 3 * Po.b, zc = P.h + Po.b / 2;
  const y0 = ys - lang / 2 + 40, L1 = yr - y0, zTop = z - 73 - Pl.h, zS0 = zTop - 100, zS1 = zTop + Pl.h;
  const sVan = (zz) => L1 - R + (Math.PI * R) / 2 + (zz - zc - R), gaten = [-1, 0, 1, 2].map((k) => zS0 + 50 + k * 45).filter((zz) => zz - zc - R > 25 && zz < rug.rug[1] - 40);
  const sp = b.buis('Ruggengraat', 'bankO', [[0, y0, zc], [0, yr, zc], [0, yr, rug.rug[2]]], { vlak: [1, 0, 0], staand: true, R, gaten: gaten.map((zz) => ({ s: sVan(zz), d: b.V.gat, as: 'w' })), opm: `vlakovaal ${Po.naam ?? ''} gebogen (1 bocht 90° R${R}): ligt op de vloerligger, staat achter de zitting en draagt zitting en rugleuning; ${gaten.length} gaten voor de zithoogte` });
  const oud = b.huidig; b.groep('Zitting');
  const sl = b.staaf('Zitslede', b.V.id === 'thuis' ? 'o100x50x3' : 'o120x60x3', [0, yr, zS0], [0, yr, zS1], { v: [0, 1, 0], in: sp.id, kap: false, gaten: [{ s: 50, d: b.V.gat, as: 'v' }], opm: 'vlakovaal één maat groter, schuift over de ruggengraat (PE-glijstrips); veerpen voor de zithoogte' });
  const front = yr - b.P(b.V.id === 'thuis' ? 'o100x50x3' : 'o120x60x3').b / 2;
  const zb = b.staaf('Zitbalk', 'bankLicht', [0, ys - lang / 2 + 20, z - 73 - Pl.h / 2], [0, front, z - 73 - Pl.h / 2], { opm: 'tegen de zitslede gelast (uitkragend)' });
  b.plaat('Kussenplaat', [-70, ys - 80, z - 73], [70, ys + 80, z - 68], { gaten: [[-50, -60], [50, -60], [50, 60], [-50, 60]].map(([dx, dy]) => ({ p: [dx, ys + dy, z - 73], d: 9 })) });
  kussenOp(b, 'Zitting', zb, lang, breed, { op: 5, schuif: (ys - (ys - lang / 2 + 20 + front) / 2) });
  b.groep(oud);
  b.pen('Veerpen zitting', [0, yr, zS0 + 50], [0, 1, 0], { d: b.V.pin, key: b.V.pin25, snedes: 2, t: 3, a: oud, b: 'Zitting', uit: [0, 160, 0], F: b.V.gebruiker, factor: 'extrinsiekPen', lengte: 120 });
  b.kussen('Rugleuning', [0, yr - Po.b / 2, rug.rug[1]], [0, yr - Po.b / 2, rug.rug[2]], [0, -1, 0], rug.breed ?? 320, 68);
  b.reken('Ruggengraat (zitting uitkragend, gebruiker)', sp, 'staanderM', zS0 - P.h, 0, { g: b.V.gebruiker, proef: 'extrinsiek', e: yr - ys, las: true });
  void sl;
}
/** het station: zitting, rug-, borst-, lig- en armkussens op palen op de vloerligger, handgrepen en een platform */
function station(b, vl, delen, Pb, P) {
  // vormtaal v8 (Fable §4 voorstel 3): zitting en rug op één gebogen ruggengraat in vlakovaal
  const zit = delen.find((s) => s.zit), rug = delen.find((s) => s.rug);
  if (zit && rug && (zit.verstel ?? true)) { ruggengraat(b, vl, zit, rug, P); delen = delen.filter((s) => s !== zit && s !== rug); }
  for (const s of delen) {
    if (s.zit) zitting(b, vl, s.zit[0], s.zit[1], s.lang ?? 340, s.breed ?? 320, { verstel: s.verstel ?? true }); // P2-02 v6: zitting op een veerpen, verstelbaar
    else if (s.rug) { staander(b, 'Rugpaal', 'bank', 0, s.rug[0], P.h, s.rug[2]); b.kussen('Rugleuning', [0, s.rug[0] - Pb.h / 2, s.rug[1]], [0, s.rug[0] - Pb.h / 2, s.rug[2]], [0, -1, 0], s.breed ?? 320, 68); }
    else if (s.borst) { staander(b, 'Kussenpaal', 'bank', 0, s.borst[0], P.h, s.borst[2]); b.kussen('Borstkussen', [0, s.borst[0] + Pb.h / 2, s.borst[1]], [0, s.borst[0] + Pb.h / 2, s.borst[2]], [0, 1, 0], s.breed ?? 300, 68); }
    else if (s.lig) {
      const [y0, y1, z] = s.lig;
      const lb = b.staaf('Ligbalk', 'bankO', [0, y0, z - Pb.h / 2 - 5], [0, y1, z - Pb.h / 2 - 5]);
      // v7 (P2-18): een kopplaat 8 mm tussen de ligpaal en de vlakovaal ligbalk (geen las over de ronding)
      for (const y of [y0 + 120, y1 - 120]) { staander(b, 'Ligpaal', 'bank', 0, y, P.h, z - Pb.h - 13); b.plaat('Kopplaat ligpaal', [-60, y - 60, z - Pb.h - 13], [60, y + 60, z - Pb.h - 5], { opm: 'kopplaat 8 mm: de ligpaal eronder, de vlakovaal ligbalk erop gelast' }); }
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
const OEF = { 'FS-01': 'druk', 'FS-02': 'druk', 'FS-03': 'arm', 'FS-04': 'arm', 'FS-05': 'romp', 'FS-06': 'lagerug', 'FS-07': 'druk', 'FS-08': 'rug', 'FS-09': 'druk', 'FS-10': 'kuit', 'FS-11': 'kuit', 'FS-12': 'been', 'FS-23': 'been', 'FS-24': 'been' };
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
