// Banken (FB-01 .. FB-12): elk in de thuis- en de proversie. Maten in mm: x = breedte, y = diepte (0 = voeteneinde),
// z = hoogte. Kussens: multiplex 18 + koudschuim RG40 50 + kunstleer; met inslagmoeren M8 op kussenplaten.
import { staander, ligger, jhook, hoorn, voetjes, kussenOp, doos, gat, X, Y, Z, balk, add, mul, sub, norm, len } from './bouwstenen.mjs';
import { lagerOren, hefboom } from './plate.mjs';

const pro = (b) => b.V.id === 'pro';
const rad = (g) => (g * Math.PI) / 180;
/** platte voet langs x op de vloer (40 hoog bij 80x40), met 2 voetjes */
function voet(b, naam, y, breedte, rol = 'bank', x0 = 0, { boog = true } = {}) {
  const P = b.P(rol), R = 3 * P.h, sw = 100, th = 2 * Math.atan(sw / (breedte / 2)), T = R * Math.tan(th / 2);
  // pro-vormtaal: de voet als gebogen koker in pijlvorm (1 bocht R = 3 x de hoogte), de punten van de bank weg
  if (boog && T < breedte / 2 - 20) {
    const k = /^(Voor|Lage)/.test(naam) ? -1 : 1;
    const sag = R * (1 / Math.cos(th / 2) - 1), yh = y - k * sag; // het hart van de boog valt op y
    const v = b.buis(naam, rol, [[x0 - breedte / 2, yh + k * sw, P.b / 2], [x0, yh, P.b / 2], [x0 + breedte / 2, yh + k * sw, P.b / 2]], { vlak: Z, R, opm: `koker gebogen (1 bocht ${Math.round((th * 180) / Math.PI)}° R${R}): pijlvormige voet, de punten ${sw} mm naar ${k < 0 ? 'voren' : 'achter'}` });
    voetjes(b, v, 2); return v;
  }
  const v = b.staaf(naam, rol, [x0 - breedte / 2, y, P.b / 2], [x0 + breedte / 2, y, P.b / 2], { v: Z });
  voetjes(b, v, 2); return v;
}
/** kussenplaat (t 5) bovenop een liggend stuk op positie t (0..1) */
function kussenplaat(b, S, t, lang = 160) {
  const [mn, mx] = doos(S), c = add(S.a, mul(sub(S.b, S.a), t)), alongY = Math.abs(S.u[1]) > 0.9, bh = (alongY ? mx[0] - mn[0] : mx[1] - mn[1]) / 2, bw = 2 * (bh + 25);
  const p0 = alongY ? [c[0] - bw / 2, c[1] - lang / 2, mx[2]] : [c[0] - lang / 2, c[1] - bw / 2, mx[2]], p1 = alongY ? [c[0] + bw / 2, c[1] + lang / 2, mx[2] + 5] : [c[0] + lang / 2, c[1] + bw / 2, mx[2] + 5];
  const gx = alongY ? [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([p, q]) => [c[0] + p * (bh + 11), c[1] + q * (lang / 2 - 15), mx[2]]) : [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([p, q]) => [c[0] + p * (lang / 2 - 15), c[1] + q * (bh + 11), mx[2]]);
  return b.plaat('Kussenplaat', p0, p1, { gaten: gx.map((p) => ({ p, d: 9 })), opm: '4 gaten Ø9 voor M8 in de inslagmoeren' });
}
/** schuine balk van p langs richting d (lengte L); kussen erop met normaal n */
function schuin(b, naam, rol, p, d, L, opt = {}) { return b.staaf(naam, rol, p, add(p, mul(norm(d), L)), opt); }
function kussenSchuin(b, naam, S, n, breedte, van = 0, tot = 1, dikte = 68) {
  const off = mul(norm(n), S.P.h / 2 + 10), a = add(add(S.a, mul(sub(S.b, S.a), van)), off), e = add(add(S.a, mul(sub(S.b, S.a), tot)), off);
  // kussenstrip (t 5) tussen balk en kussen: als dunne schuine strip
  b.staaf(`Kussenstrip ${naam.toLowerCase()}`, 's60x10', add(add(S.a, mul(sub(S.b, S.a), van + 0.04)), mul(norm(n), S.P.h / 2 + 5)), add(add(S.a, mul(sub(S.b, S.a), tot - 0.04)), mul(norm(n), S.P.h / 2 + 5)), { v: norm(n), kap: false, opm: 'platstaal 60x10 met 4 gaten Ø9 (M8 in de inslagmoeren)' });
  return b.kussen(naam, a, e, n, breedte, dikte);
}
const cross3 = (a, c) => [a[1] * c[2] - a[2] * c[1], a[2] * c[0] - a[0] * c[2], a[0] * c[1] - a[1] * c[0]];
/** vlakke bankbasis: voorvoet, achtervoet, twee poten, ligger; geeft { lig, poten, voeten, top } */
function bankBasis(b, L = 1150, top = 372, yv = 120, ya = null, { vorm = false } = {}) {
  if (vorm) return bankVorm(b, L, top, yv, ya ?? L - 120);
  const P = b.P('bank'), h = P.h, Pv = b.P('bank');
  ya = ya ?? L - 120;
  const v1 = voet(b, 'Voorvoet', yv, pro(b) ? 460 : 400), v2 = voet(b, 'Achtervoet', ya, pro(b) ? 460 : 400);
  const p1 = staander(b, 'Poot', 'bank', 0, yv, Pv.b, top - h), p2 = staander(b, 'Poot', 'bank', 0, ya, Pv.b, top - h);
  const lig = b.staaf('Ligger', 'bank', [0, 0, top - h / 2], [0, L, top - h / 2]);
  return { lig, poten: [p1, p2], voeten: [v1, v2], top };
}

/**
 * bankframe in de pro-vormtaal: ligger in vlakovaalbuis, een gebogen achterpoot (schuin naar achter, met een bocht in de
 * vloerloper), een rechte voorpoot op een voorvoet met twee transportwielen, en een handgreep aan het hoofdeinde om
 * de bank op de wielen te kantelen en te verrijden.
 */
function bankVorm(b, L, top, yv, ya) {
  const P = b.P('bankO'), h = P.h, Pv = b.P('bank'), br = pro(b) ? 460 : 400;
  const lig = b.staaf('Ligger', 'bankO', [0, 0, top - h / 2], [0, L, top - h / 2], { opm: 'vlakovaalbuis, hoogte verticaal' });
  const v1 = voet(b, 'Voorvoet', yv, br, 'bank', 0, { boog: false });
  const p1 = staander(b, 'Poot', 'bankO', 0, yv, Pv.b, top - h);
  // achterpoot: van onder de ligger schuin naar achter tot op de vloer, dan in een bocht naar een korte vloerloper
  const zv = Pv.b / 2, yA = ya - 230, yB = ya + 10, yC = ya + 170, R = 3 * P.h;
  const p2 = b.buis('Achterpoot', 'bankO', [[0, yA, top - h], [0, yB, zv], [0, yC, zv]], { R, vlak: [1, 0, 0], opm: `vlakovaalbuis, 1 bocht R${R}: van de ligger schuin naar achter tot in de vloerloper` });
  const v2 = voet(b, 'Achtervoet', yC + Pv.h / 2, br);
  // transportwielen aan de uiteinden van de voorvoet (5 mm boven de vloer: de bank staat op de stelvoeten)
  const wz = 30 + 5;
  b.koop('transportwiel', 2, [-1, 1].map((sx) => balk([sx * (br / 2 + 2), yv, wz], [sx * (br / 2 + 28), yv, wz], [0, 1, 0], 60, 60, true, 'rubber')), { naam: 'Transportwiel PU Ø60 aan de voorvoet (as M10 in een lasmoer)' });
  // handgreep aan het hoofdeinde (achteraan): buis Ø32 dwars tegen de kopse kant van de ligger
  b.staaf('Handgreep verplaatsen', 'greep', [-170, L + 16, top - h / 2], [170, L + 16, top - h / 2], { opm: 'buis Ø32 tegen de kopse kant van de ligger gelast; rubber handvat aan beide uiteinden: optillen en op de wielen rijden' });
  return { lig, poten: [p1, p2], voeten: [v1, v2], top };
}

export const BANKEN = [
  {
    id: 'FB-01', soort: 'bank', naam: 'Vlakke bank', kort: 'Stevige vlakke bank, kussen op 440 mm.',
    uitleg: 'Een ligger op twee poten en twee platte voeten met rubber stelvoeten. Kussen 1150 x 280 (pro 1200 x 300), bovenkant op 440 mm zoals in het krachtsport-reglement (420-450).',
    spieren: 'borst, schouders, triceps (met halters)', oefeningen: ['bankdrukken met halters', 'dumbbell row', 'step-ups', 'hip thrust'],
    maxLast: { thuis: 80, pro: 120 },
    markt: { thuis: [160, 305], pro: [400, 850], bronT: 'ATX Flat Bench € 169-289, Bodycraft € 299, Rogue Bolt Together Utility € 304', bronP: 'Taurus Studio € 399, Rogue Monster Utility 2.0 € 496, Hammer Strength Flat Bench ± € 810' },
    bouw(b) {
      const V = b.V, L = pro(b) ? 1200 : 1150, B = pro(b) ? 300 : 280, bb = bankBasis(b, L, 372, 70, L - 70, { vorm: true });
      kussenplaat(b, bb.lig, 0.2); kussenplaat(b, bb.lig, 0.8);
      kussenOp(b, 'Kussen', bb.lig, L, B, { op: 5, taps: [B - 50, B] });
      b.last('Gebruiker zit op het einde van de bank', 100, [0, L - 120, 600], { geval: 'liggen' });
      b.last('Eén halter naast de bank (rotatieproef: 10 kg H, 20 kg S)', V.klasse === 'H' ? 10 : 20, [380, L / 2, 700], { geval: 'liggen' });
      b.reken('Ligger tussen de poten', bb.lig, 'ligger', bb.poten[1].a[1] - bb.poten[0].a[1], 0, { gk: V.gebruiker, g: this.maxLast[V.id], proef: 'extrinsiek' });
      b.reken('Poot', bb.poten[0], 'staander', 372 - b.P('bank').h, 0, { gk: V.gebruiker / 2, g: this.maxLast[V.id] / 2, proef: 'extrinsiek', las: true, e: 0 });
    },
  },
  {
    id: 'FB-02', soort: 'bank', naam: 'Verstelbare bank (FID)', kort: 'Rugleuning van 25° tot 85° met een ladder (plat zonder steun); vaste zitting, geen decline.',
    uitleg: 'Vlakke basis met een scharnierende rugleuning op een steun (pen-pen 420 mm) die in een ladder met 7 inkepingen valt: van 25° tot 85°. Plat leggen kan met de steun uit de ladder. Getekend op 25°.',
    spieren: 'borst (bovenste deel), schouders, triceps', oefeningen: ['schuin bankdrukken met halters', 'schouderdrukken zittend', 'flyes', 'bicep curls zittend'],
    maxLast: { thuis: 80, pro: 120 },
    markt: { thuis: [300, 830], pro: [800, 1950], bronT: 'Gorilla verstelbare bank € 300, Bodycraft F320 € 349, Taurus B990 € 399, Rogue Adjustable 3.0 € 829', bronP: 'Matrix Multi-Adjustable € 799, Rogue Manta Ray € 1216, Hammer Strength Multi-Adjustable ± € 1950' },
    bouw(b) {
      const V = b.V, L = 1300, B = pro(b) ? 300 : 280, P = b.P('bank'), Pl = b.P('bankLicht'), top = 372, a = rad(30), yp = 470;
      const bb = bankBasis(b, L, top, 120, L - 120, { vorm: true });
      kussenplaat(b, bb.lig, 0.1);
      kussenOp(b, 'Zitting', bb.lig, 300, B, { op: 5, t: 0.11, taps: [B - 40, B], neus: { kant: 'a', r: 110 } });
      // scharnieroren en ladder op de ligger; de rugleuning staat op 25° (stand 0) tot 85° (stand 1)
      const zp = top + 40, piv = [0, yp, zp], a2 = rad(25 + 60 * b.stand), Lp = 420;
      for (const s of [-1, 1]) b.plaat('Scharnieroor', [s * (P.b / 2) + (s > 0 ? 0 : -V.plaat), yp - 40, top], [s * (P.b / 2) + (s > 0 ? V.plaat : 0), yp + 40, top + 80], { gaten: [{ p: [s * P.b / 2, yp, zp], d: V.pin + 1 }] });
      for (const s of [-1, 1]) b.plaat('Ladderplaat', [s * (P.b / 2) + (s > 0 ? 0 : -V.plaat), yp + 250, top], [s * (P.b / 2) + (s > 0 ? V.plaat : 0), yp + 830, top + 100], { vorm: 'ladder', opm: '7 inkepingen R11 voor de steunpen Ø20 (laser), van 25° tot 85°' });
      b.groep('Rugleuning');
      const d = [0, Math.cos(a2), Math.sin(a2)], n = [0, -Math.sin(a2), Math.cos(a2)];
      b.staaf('Scharnierbus', 'bus', [-P.b / 2, yp, zp], [P.b / 2, yp, zp], { kap: false });
      const rl = schuin(b, 'Rugleuningbalk', 'bankLicht', add(piv, mul(n, 21 + Pl.h / 2)), d, 760, { v: X });
      kussenSchuin(b, 'Rugleuning', rl, n, B, 0.02, 1);
      const q = add(add(piv, mul(n, 21 - 95)), mul(d, 380));
      for (const s of [-1, 1]) b.staaf('Steunoor', 's80x10', add(add(add(piv, mul(n, 21)), mul(d, 380)), [s * (P.b / 2 + V.plaat + 13), 0, 0]), add(add(q, mul(n, -40)), [s * (P.b / 2 + V.plaat + 13), 0, 0]), { v: X, kap: false, gaten: [{ s: 95, d: V.pin + 1, as: 'v' }], opm: 'onder de rugleuningbalk gelast, gat voor de pen; buiten de ladderplaten' });
      b.groep('Steun');
      const dz = q[2] - (top + 70), ql = [0, q[1] + Math.sqrt(Math.max(0, Lp ** 2 - dz ** 2)), top + 70], es = norm(sub(q, ql));
      b.staaf('Steunbeugel', 'bank', add(q, mul(es, 40)), add(ql, mul(es, -40)), { v: X, gaten: [{ s: 40, d: V.pin + 1, as: 'v' }, { s: Lp + 40, d: 21, as: 'v' }], opm: `pen-pen ${Lp} mm; onderaan de pen Ø20 die in de ladder valt, bovenaan de pen in de steunoren` });
      b.groep('frame');
      b.pen('Scharnier rugleuning', piv, X, { d: V.pin, snedes: 2, a: 'frame', b: 'Rugleuning', uit: [0, 0, 150], lengte: P.b + 2 * V.plaat + 30, key: b.V.pin25 });
      b.pen('Steun in de ladder', ql, X, { d: 20, gelast: 'Ladderplaat', snedes: 2, a: 'frame', b: 'Steun', uit: [0, 80, 60], lengte: P.b + 2 * V.plaat + 20 });
      b.pen('Steun aan de rugleuning', q, X, { d: V.pin, snedes: 2, a: 'Rugleuning', b: 'Steun', uit: [0, 0, 100], lengte: 2 * (P.b / 2 + V.plaat + 18) + 20, key: b.V.pin25 });
      b.last('Gebruiker op de rugleuning', 100, add(piv, mul(d, 350)), { geval: 'schuin' });
      b.last('Halters', this.maxLast[V.id], add(piv, mul(d, 600)), { geval: 'schuin' });
      b.reken('Rugleuningbalk (scharnier tot steun)', rl, 'ligger', 420, 0, { gk: V.gebruiker * 0.6, g: this.maxLast[V.id], proef: 'extrinsiek' });
      b.reken('Ligger tussen de poten', bb.lig, 'ligger', L - 240, 0, { gk: V.gebruiker, g: this.maxLast[V.id], proef: 'extrinsiek' });
      b.o.pennen.forEach((p) => { p.F = (V.gebruiker * 0.6 + 1.5 * this.maxLast[V.id]) / 1.5; p.factor = 'extrinsiekPen'; });
    },
  },
  {
    id: 'FB-03', soort: 'bank', naam: 'Bankdrukstation vlak', kort: 'Vlakke bank met vaste steunen voor de stang.',
    uitleg: 'Olympische vlakke bank: aan het hoofdeinde twee staanders op lange voeten met vaste haken op 2 hoogtes, schijfhouders achteraan. De bank is met de staanders verbonden.',
    spieren: 'borst, schouders, triceps', oefeningen: ['bankdrukken', 'close grip bankdrukken'],
    maxLast: { thuis: 200, pro: 300 },
    markt: { thuis: [600, 930], pro: [1300, 1900], bronT: 'ATX Bench Press 700 € 599-685, Rogue Monster Lite Competition Bench € 926', bronP: 'Taurus Elite € 1299, Watson Olympic Flat Bench ± € 1350-1600, Life Fitness Olympic Flat Bench ± € 1610-1789' },
    bouw(b) { bankStation(b, this, { hoek: 0, haken: [880, 1020], zit: false }); },
  },
  {
    id: 'FB-04', soort: 'bank', naam: 'Bankdrukstation schuin', kort: 'Schuine bank (30°) met steunen en zitting.',
    uitleg: 'Olympische schuine bank op 30°: zitting, vaste rugleuning, staanders met haken op 2 hoogtes en een opstap voor de spotter.',
    spieren: 'bovenste borst, schouders, triceps', oefeningen: ['schuin bankdrukken'],
    maxLast: { thuis: 180, pro: 280 },
    markt: { thuis: [315, 900], pro: [1000, 1900], bronT: 'Primal Pro Series Olympic Incline ± € 315, ATX Multi Bench Press € 899', bronP: 'Watson Olympic Incline ± € 1015, Taurus Studio Incline € 1499, Primal Club ± € 1510, Life Fitness ± € 1817' },
    bouw(b) { bankStation(b, this, { hoek: 30, haken: [1130, 1270], zit: true }); },
  },
  {
    id: 'FB-05', soort: 'bank', naam: 'Schouderdrukbank met steunen', kort: 'Bijna rechte rugleuning (80°) met hoge steunen.',
    uitleg: 'Zitting en rugleuning op 80°, staanders achter de rugleuning met haken op 2 hoogtes en een opstap voor de spotter.',
    spieren: 'schouders, triceps, bovenrug', oefeningen: ['militaire press zittend', 'nekdrukken'],
    maxLast: { thuis: 150, pro: 220 },
    markt: { thuis: [400, 900], pro: [1300, 2000], bronT: 'ATX Multi Bench Press met nekdruk € 899', bronP: 'AANNAME: op het niveau van de olympische schuine banken' },
    bouw(b) { bankStation(b, this, { hoek: 80, haken: [1330, 1470], zit: true }); },
  },
  {
    id: 'FB-06', soort: 'bank', naam: 'Zitbank 90°', kort: 'Lage zitbank met rechte rugleuning.',
    uitleg: 'Zitting op 450 mm en een rugleuning op 85°, op een H-voet met rubbervoetjes. Voor schouderdrukken en curls met halters.',
    spieren: 'schouders, armen', oefeningen: ['schouderdrukken met halters', 'curls zittend', 'laterale raises'],
    maxLast: { thuis: 80, pro: 120 },
    markt: { thuis: [200, 800], pro: [400, 900], bronT: 'Tunturi Platinum Utility Bench € 799 (eenvoudige thuismodellen AANNAME vanaf € 200)', bronP: 'Hammer Strength Utility Bench 75° ± € 360-890' },
    bouw(b) {
      const V = b.V, P = b.P('bank'), Pl = b.P('bankLicht'), B = pro(b) ? 320 : 300, top = 382;
      const v1 = voet(b, 'Voorvoet', 60, 460), v2 = voet(b, 'Achtervoet', 620, 460);
      const lig = b.staaf('Vloerligger', 'bank', [0, 60 + P.h / 2, P.b + P.h / 2], [0, 620 - P.h / 2, P.b + P.h / 2]);
      const p = staander(b, 'Zitpaal', 'bank', 0, 250, P.b + P.h, top - Pl.h);
      const z = b.staaf('Zitbalk', 'bankLicht', [0, 60, top - Pl.h / 2], [0, 470, top - Pl.h / 2]);
      kussenplaat(b, z, 0.5, 200);
      kussenOp(b, 'Zitting', z, 400, B, { op: 5 });
      const a = rad(85), d = [0, -Math.cos(a), Math.sin(a)], n = [0, -Math.sin(a), -Math.cos(a)];
      const rp = staander(b, 'Rugpaal', 'bank', 0, 560, P.b + P.h, 1000);
      void d; void n;
      const rb = b.staaf('Rugleuningbalk', 'bankLicht', [0, 560 - P.h / 2 - Pl.h / 2, 470], [0, 560 - P.h / 2 - Pl.h / 2, 1080], { v: X });
      b.kussen('Rugleuning', [0, 560 - P.h / 2 - Pl.h, 490], [0, 560 - P.h / 2 - Pl.h, 1070], [0, -1, 0], B, 68);
      void v1; void v2; void lig; void p; void rp; void rb;
      b.last('Gebruiker die achterover leunt', 100, [0, 400, 800], { geval: 'zitten' });
      b.reken('Rugpaal (gebruiker leunt achterover)', rp, 'staanderM', 1000 - P.b - 2 * P.h, 0, { gk: V.gebruiker * 0.3, g: this.maxLast[V.id] * 0.3, proef: 'extrinsiek', e: 600, las: true });
      b.reken('Zitbalk', z, 'ligger', 400, 0, { gk: V.gebruiker, g: this.maxLast[V.id], proef: 'extrinsiek' });
    },
  },
  {
    id: 'FB-07', soort: 'bank', naam: 'Preacher curl bank', kort: 'Zitting en een schuin armkussen (45°).',
    uitleg: 'Een zitting op 560 mm en een armkussen op 45° op een aparte paal, op een H-voet. Twee haken onder het armkussen voor een EZ-stang.',
    spieren: 'biceps, brachialis', oefeningen: ['preacher curl', 'hammer curl op de bank'],
    maxLast: { thuis: 50, pro: 80 },
    markt: { thuis: [170, 700], pro: [560, 820], bronT: 'Gorilla Bicep curlbank € 170, ATX Bicep Curl Bench € 449, Taurus Elite Preacher Curl € 699', bronP: 'NPG T-Line ± € 557, Tunturi Platinum Preacher € 749, Primal Standing Preacher ± € 815' },
    bouw(b) {
      const V = b.V, P = b.P('bank'), Pl = b.P('bankLicht'), B = pro(b) ? 320 : 300;
      const v1 = voet(b, 'Voorvoet', 80, 560), v2 = voet(b, 'Achtervoet', 860, 520);
      b.staaf('Vloerligger', 'bank', [0, 80 + P.h / 2, P.b + P.h / 2], [0, 860 - P.h / 2, P.b + P.h / 2]);
      const pa = staander(b, 'Armpaal', 'bank', 0, 220, P.b + P.h, 760), pz = staander(b, 'Zitpaal', 'bank', 0, 700, P.b + P.h, 560 - 68 - 5 - Pl.h);
      const z = b.staaf('Zitbalk', 'bankLicht', [0, 600, 560 - 73 - Pl.h / 2], [0, 860, 560 - 73 - Pl.h / 2]);
      kussenplaat(b, z, 0.5, 160); kussenOp(b, 'Zitting', z, 340, B, { op: 5 });
      const a45 = rad(45), u = [0, -Math.cos(a45), -Math.sin(a45)], n = [0, -Math.sin(a45), Math.cos(a45)];
      const s = b.staaf('Armsteun', 'bankLicht', [0, 220 + 230, 760 + 230 + Pl.h * 0.71], [0, 220 - 160, 760 - 160 + Pl.h * 0.71], { v: X, opm: 'op de armpaal gelast (schuine las)' });
      void u;
      kussenSchuin(b, 'Armkussen', s, n, pro(b) ? 520 : 480, 0.02, 0.98);
      const kl = b.P('klein').b;
      b.staaf('Haakdrager', 'klein', [-200, 220 - P.h / 2 - kl / 2, 640], [200, 220 - P.h / 2 - kl / 2, 640], { v: Y, opm: 'tegen de voorkant van de armpaal gelast' });
      for (const x of [-170, 170]) b.staaf('EZ-haak', 'r20', [x, 220 - P.h / 2 - kl, 640], [x, 220 - P.h / 2 - kl - 90, 640], { opm: 'gebogen haak R30 met lip' });
      void v1; void v2; void pz;
      b.last('Gebruiker leunt op het armkussen', 100, [0, 300, 900], { geval: 'curl' });
      b.reken('Armpaal (gebruiker leunt op het armkussen)', pa, 'staanderM', 760 - P.b - P.h, 0, { gk: V.gebruiker * 0.4, g: this.maxLast[V.id], proef: 'extrinsiek', e: 120, las: true });
    },
  },
  {
    id: 'FB-08', soort: 'bank', naam: 'Hyperextension 45°', kort: 'Rugstrekker op 45° met heupkussen en enkelrollen.',
    uitleg: 'Een schuine hoofdbalk op 45° op een rechthoekige voet, een breed heupkussen bovenaan, een voetplaat en twee enkelrollen onderaan.',
    spieren: 'onderrug, bilspieren, hamstrings', oefeningen: ['back extension', 'reverse hyper (licht)', 'oblique raises'],
    maxLast: { thuis: 20, pro: 40 },
    markt: { thuis: [130, 400], pro: [700, 1200], bronT: 'Gorilla Roman chair € 130, Maxxus Hyperextension Pro € 220, Taurus B850 € 299, Bodycraft F760 € 399', bronP: 'Primal Club Hyper Extension ± € 930 (bandbreedte AANNAME)' },
    bouw(b) {
      const V = b.V, P = b.P('bank'), Pl = b.P('bankLicht'), lv = b.P('licht'), w = 520;
      const r1 = b.staaf('Voetrail', 'licht', [-w / 2, 0, lv.h / 2], [-w / 2, 1200, lv.h / 2]), r2 = b.staaf('Voetrail', 'licht', [w / 2, 0, lv.h / 2], [w / 2, 1200, lv.h / 2]);
      voetjes(b, r1, 2); voetjes(b, r2, 2);
      const dv = ligger(b, 'Dwarsligger voor', 'licht', r1, r2, { y: 250, z: lv.h / 2 }), da = ligger(b, 'Dwarsligger achter', 'licht', r1, r2, { y: 1100, z: lv.h / 2 });
      ligger(b, 'Dwarsligger voetplaat', 'licht', r1, r2, { y: 1170, z: lv.h / 2 });
      const pv = staander(b, 'Voorpaal', 'bank', 0, 250, lv.h, 900);
      const hb = b.staaf('Hoofdbalk 45°', 'bank', [0, 1100 - lv.b / 2, lv.h + 20], [0, 250 + P.h / 2, 900 - 20], { v: X, verstek: [45, 45] });
      const top = b.staaf('Kussendrager', 'bankLicht', [-160, 250, 900 + Pl.h / 2], [160, 250, 900 + Pl.h / 2], { v: Y });
      b.kussen('Heupkussen', [-150, 250, 900 + Pl.h], [150, 250, 900 + Pl.h], Z, 260, 80);
      const vp = b.plaat('Voetplaat', [-150, 1030, 290], [150, 1195, 296], { opm: 'antislip: traanplaat of rubber erop' });
      b.staaf('Steun voetplaat', 'bankLicht', [0, 1170, lv.h], [0, 1170, 290], {});
      const rp = staander(b, 'Rolpaal', 'bankLicht', 0, 1050, 296, 540);
      b.staaf('As enkelrollen', 'as', [-120, 1050, 500], [120, 1050, 500], { kap: false, in: rp.id });
      b.koop(V.schuimrol, 2, [-1, 1].map((s) => balk([s * 20, 1050 - 60, 500], [s * 220, 1050 - 60, 500], X, 100, 100, true, 'leer')));
      void dv; void da; void vp; void rp; void hb; void top;
      b.last('Gebruiker op het heupkussen', 100, [0, 400, 1000], { geval: 'extensie' });
      b.reken('Voorpaal met het heupkussen', pv, 'staanderM', 900 - lv.h, 0, { gk: V.gebruiker, g: this.maxLast[V.id], proef: 'extrinsiek', e: 120, las: true });
    },
  },
  {
    id: 'FB-09', soort: 'bank', naam: 'GHD (glute ham developer)', kort: 'Dubbel heupkussen, voetplaat en enkelrollen, verstelbaar.',
    uitleg: 'Een lange voet met een voorpaal (heupkussens op 1000 mm) en een schuifbalk naar de achterpaal met de voetplaat en vier enkelrollen. De afstand stel je in met een veerpen in de schuifbalk.',
    spieren: 'hamstrings, bilspieren, onderrug, buik', oefeningen: ['glute ham raise', 'back extension', 'GHD sit-up'],
    maxLast: { thuis: 20, pro: 40 },
    markt: { thuis: [550, 1100], pro: [1160, 2700], bronT: 'ATX GHD Cross € 549, Rogue Abram GHD 2.0 € 1076, ATX Glute Ham Trainer Pro € 1099', bronP: 'Primal Performance GHD ± € 1160 tot ± € 2670 (VS)' },
    bouw(b) {
      const V = b.V, S = b.P('staander'), lv = b.P('licht'), w = 560, a = S.b;
      const r1 = b.staaf('Voetrail', 'licht', [-w / 2, 0, lv.h / 2], [-w / 2, 1500, lv.h / 2]), r2 = b.staaf('Voetrail', 'licht', [w / 2, 0, lv.h / 2], [w / 2, 1500, lv.h / 2]);
      voetjes(b, r1, 2); voetjes(b, r2, 2);
      const d1 = ligger(b, 'Dwarsligger', 'staander', r1, r2, { y: 400, z: a / 2 }), d2 = ligger(b, 'Dwarsligger', 'staander', r1, r2, { y: 1000, z: a / 2 });
      const pv = staander(b, 'Voorpaal', 'staander', 0, 400, a, 900);
      const sb = b.staaf('Buitenkoker (schuifbalk)', 'staander', [0, 400 + a / 2, 900 - a / 2], [0, 1000, 900 - a / 2], { gaten: [715, 765, 815, 865, 915].map((s) => ({ s: s - 400 - a / 2, d: 17, as: 'v' })), opm: '5 standen om de 50 mm voor de veerpen Ø16' });
      b.staaf('Steun buitenkoker', 'licht', [0, 1000 - lv.b / 2, a], [0, 1000 - lv.b / 2, 900 - a], { opm: 'onder het einde van de buitenkoker' });
      b.plaat('Kussenplaat', [-200, 400 - 120, 900], [200, 400 + 120, 906], { gaten: [[-150, -90], [150, -90], [-150, 90], [150, 90]].map(([x, y]) => ({ p: [x, 400 + y, 900], d: 9 })) });
      for (const s of [-1, 1]) b.kussen('Heupkussen', [-200, 400 + s * 65, 906], [200, 400 + s * 65, 906], Z, 120, 110);
      b.groep('Voetdeel');
      const ib = b.staaf('Binnenkoker', 'licht', [0, 820, 900 - a / 2], [0, 1400, 900 - a / 2], { in: sb.id, gaten: [{ s: 45, d: 17, as: 'v' }] });
      const ap = staander(b, 'Achterpaal', 'licht', 0, 1400 + lv.b / 2 + 0, 900 - a / 2 - lv.h / 2, 1240);
      ap.a = [0, 1400 + lv.b / 2, 900 - a / 2 - lv.h / 2]; ap.b = [0, 1400 + lv.b / 2, 1240]; ap.L = ap.b[2] - ap.a[2]; ap.geo = [balk(ap.a, ap.b, X, lv.b, lv.h)];
      b.plaat('Voetplaat', [-160, 1400 + lv.b, 820], [160, 1406 + lv.b, 1150], { opm: 'antislip' });
      b.staaf('As enkelrollen', 'as', [-130, 1400 + lv.b / 2, 1060], [130, 1400 + lv.b / 2, 1060], { kap: false, in: ap.id });
      b.staaf('As enkelrollen', 'as', [-130, 1400 + lv.b / 2, 1190], [130, 1400 + lv.b / 2, 1190], { kap: false, in: ap.id });
      void ib;
      b.groep('frame');
      b.koop(V.schuimrol, 4, [1060, 1190].flatMap((z) => [-1, 1].map((s) => balk([s * 20, 1400 + lv.b / 2 - 65, z], [s * 220, 1400 + lv.b / 2 - 65, z], X, 100, 100, true, 'leer'))), { naam: 'Schuimrol Ø100 (enkelrollen)' });
      b.pen('Veerpen schuifbalk', [0, 865, 900 - a / 2], X, { d: 16, key: 'pullpin16', lengte: a + 50, snedes: 2, a: 'frame', b: 'Voetdeel', uit: [100, 0, 0], F: V.gebruiker * 0.5, factor: 'intrinsiekPen' });
      void d1; void d2;
      b.last('Gebruiker op de heupkussens, bovenlijf naar voren', 100, [0, 200, 1100], { geval: 'ghr' });
      b.reken('Voorpaal', pv, 'staanderM', 900 - a, 0, { gk: V.gebruiker, g: this.maxLast[V.id], proef: 'extrinsiek', e: 200, las: true });
      b.reken('Schuifbalk (uitkragend naar de voetplaat)', sb, 'uitkrager', 600, 0, { gk: V.gebruiker * 0.5, proef: 'extrinsiek', las: true });
    },
  },
  {
    id: 'FB-10', soort: 'bank', naam: 'Buikbank (decline)', kort: 'Schuine sit-upbank met beenrollen.',
    uitleg: 'Een schuine bank (25° naar beneden) met twee paar beenrollen aan het hoge einde. Op twee platte voeten.',
    spieren: 'buik, heupbuigers', oefeningen: ['decline sit-up', 'crunch', 'leg raise (omgekeerd)'],
    maxLast: { thuis: 20, pro: 30 },
    markt: { thuis: [110, 240], pro: [500, 1000], bronT: 'Gorilla buikspierbank € 110-240', bronP: 'AANNAME: geen echte pro-buikbank gevonden' },
    bouw(b) {
      const V = b.V, P = b.P('bank'), lv = b.P('bankLicht'), B = pro(b) ? 300 : 280, a = rad(25);
      const v1 = voet(b, 'Lage voet', 150, 420), v2 = voet(b, 'Hoge voet', 1180, 460);
      const zl = 300, d = [0, Math.cos(a), Math.sin(a)], n = [0, -Math.sin(a), Math.cos(a)];
      const pl = staander(b, 'Lage poot', 'bank', 0, 150, P.b, zl), ph = staander(b, 'Hoge poot', 'bank', 0, 1180, P.b, zl + Math.tan(a) * 1030 - 10);
      const lig = b.staaf('Schuine ligger', 'bank', [0, 150 - 100, zl + P.h / 2 - Math.tan(a) * 100], add([0, 150 - 100, zl + P.h / 2 - Math.tan(a) * 100], mul(d, 1350)), { v: X, opm: 'onderaan schuin gezaagd (25°)' });
      kussenSchuin(b, 'Kussen', lig, n, B, 0.0, 0.8);
      const rp = staander(b, 'Rolpaal', 'bankLicht', 0, 1180 - P.h / 2 - lv.h / 2 - 150, 0, 0);
      rp.a = add(lig.a, mul(d, 1180)); rp.a = [0, rp.a[1], rp.a[2] + P.h / 2 / Math.cos(a) - 1]; rp.b = [0, rp.a[1], rp.a[2] + 230]; rp.L = 230; rp.geo = [balk(rp.a, rp.b, X, lv.b, lv.h)];
      for (const z of [rp.a[2] + 90, rp.a[2] + 210]) {
        b.staaf('As beenrollen', 'as', [-130, rp.a[1], z], [130, rp.a[1], z], { kap: false, in: rp.id });
        b.koop(V.schuimrol, 2, [-1, 1].map((s) => balk([s * 20, rp.a[1], z], [s * 220, rp.a[1], z], X, 100, 100, true, 'leer')), { naam: 'Schuimrol Ø100 (beenrollen)' });
      }
      void v1; void v2; void pl; void ph; void n;
      b.last('Gebruiker', 100, [0, 600, 600], { geval: 'situp' });
      b.reken('Schuine ligger tussen de poten', lig, 'ligger', 1030 / Math.cos(a), 0, { gk: V.gebruiker, g: this.maxLast[V.id], proef: 'extrinsiek' });
    },
  },
  {
    id: 'FB-11', soort: 'bank', naam: 'Hip thrust bank', kort: 'Lage bank met rugkussen langs de zijkant en voetplatform.',
    uitleg: 'Een rugkussen van 1200 mm op 400 mm hoogte langs de lange zijde, twee poten met voeten en twee liggers naar voren met 4 pinnen voor elastieken.',
    spieren: 'bilspieren, hamstrings', oefeningen: ['hip thrust', 'glute bridge met band', 'step-ups'],
    maxLast: { thuis: 150, pro: 250 },
    markt: { thuis: [115, 380], pro: [400, 900], bronT: 'Primal hip thrust bench ± € 115, ATX Hip Thruster € 299-319, Rogue Monster Lite € 321', bronP: 'Primal Performance Hip Thrust ± € 350-465: AANNAME tot € 900' },
    bouw(b) {
      const V = b.V, P = b.P('bank'), lv = b.P('licht'), Bt = 1200, top = 400 - 73, xs = 450;
      const lig = b.staaf('Ligger', 'bank', [-Bt / 2, 900, top - P.h / 2], [Bt / 2, 900, top - P.h / 2], { v: Y });
      const rails = [];
      for (const x of [-xs, xs]) {
        const pt = staander(b, 'Poot', 'bank', x, 900, lv.h, top - P.h);
        const rl = b.staaf('Voetligger', 'licht', [x, -200, lv.h / 2], [x, 1150, lv.h / 2]);
        voetjes(b, rl, 2); rails.push(rl);
        for (const y of [-120, 400]) b.staaf('Pin voor elastiek', 'r25', [x, y, lv.h], [x, y, lv.h + 90], { kap: false, opm: 'kop afronden' });
        void pt;
      }
      ligger(b, 'Dwarsligger voor', 'licht', rails[0], rails[1], { y: -150, z: lv.h / 2 });
      kussenplaat(b, lig, 0.25); kussenplaat(b, lig, 0.75);
      kussenOp(b, 'Rugkussen', lig, Bt, 280, { op: 5, n: Z });
      b.last('Gebruiker leunt met de rug op het kussen + stang', 100, [0, 820, 500], { geval: 'thrust' }); b.last('Stang op de heupen', this.maxLast[V.id], [0, 500, 500], { geval: 'thrust' });
      b.reken('Ligger tussen de poten', lig, 'ligger', 2 * xs, 0, { gk: V.gebruiker * 0.5, g: this.maxLast[V.id] * 0.5, proef: 'extrinsiek' });
    },
  },
  {
    id: 'FB-12', soort: 'bank', naam: 'Reverse hyper', kort: 'Hoog kussen met een slingerarm en schijfhouder.',
    uitleg: 'Een hoog kussen (1050 mm) met handgrepen; achteraan een slingerarm op een as in twee flensglijlagers (lagerbussen op de oren), met begin- en eindaanslag, een enkelrol en een schijfhouder.',
    spieren: 'onderrug, bilspieren, hamstrings', oefeningen: ['reverse hyperextension', 'rugrevalidatie'],
    maxLast: { thuis: 60, pro: 100 },
    markt: { thuis: [475, 1220], pro: [1500, 3000], bronT: 'Rogue Westside Scout Hyper € 474, ATX Reverse Hyper II € 1217', bronP: 'geen pro-prijs gevonden: AANNAME € 1500-3000' },
    bouw(b) {
      const V = b.V, S = b.P('staander'), a = S.b, lv = b.P('licht'), w = 600, top = 1050 - 73;
      const r1 = b.staaf('Voetrail', 'staander', [-w / 2, 0, a / 2], [-w / 2, 1300, a / 2]), r2 = b.staaf('Voetrail', 'staander', [w / 2, 0, a / 2], [w / 2, 1300, a / 2]);
      voetjes(b, r1, 2); voetjes(b, r2, 2);
      const d1 = ligger(b, 'Dwarsligger', 'staander', r1, r2, { y: 250, z: a / 2 }), d2 = ligger(b, 'Dwarsligger', 'staander', r1, r2, { y: 1100, z: a / 2 });
      const p1 = staander(b, 'Voorpaal', 'staander', 0, 250, a, top - a), p2 = staander(b, 'Achterpaal', 'staander', 0, 1100, a, top - a);
      const lig = b.staaf('Bovenligger', 'staander', [0, 100, top - a / 2], [0, 1100 + a / 2, top - a / 2]);
      kussenplaat(b, lig, 0.15); kussenplaat(b, lig, 0.55);
      kussenOp(b, 'Heupkussen', lig, 800, 320, { op: 5, schuif: -100 });
      for (const s of [-1, 1]) { b.staaf('Handgreep', 'greep', [s * (a / 2), 140, top - a / 2], [s * 300, 140, top - a / 2], {}); }
      // slingerarm op de hefboom-bouwsteen (P1-11): naaf, as Ø25/30 als staaf, flensglijlagers in lagerbussen op de oren,
      // stelringen, begin- en eindaanslag; de arm zwaait 60° naar achter
      const zp = top - a / 2, yp = 1100 + a / 2 + 75, G = this.maxLast[V.id];
      lagerOren(b, [0, yp, zp], a, [0, 1100 - a / 2, 0], 'gat = buitenmaat flensglijlager (H7); oren tegen de zijkant van de bovenligger gelast');
      const hb = hefboom(b, 'Slingerarm', [0, yp, zp], [[0, yp, 260]], { breed: a, prof: 'staander', slag: 60, F: G, horen: [{ p: [0, yp, 290], dir: [0, 1, 0], L: 250 }],
        extra: (rot) => { const r1 = rot([0, yp - 60, 330]); b.staaf('As enkelrol', 'as', [-180, r1[1], r1[2]], [180, r1[1], r1[2]], { kap: false, in: 'slingerarm' }); },
      });
      const rr = hb.rot([0, yp - 60, 330]);
      b.koop(V.schuimrol, 2, [-1, 1].map((s2) => balk([s2 * 25, rr[1], rr[2]], [s2 * 180, rr[1], rr[2]], X, 100, 100, true, 'leer')), { naam: 'Schuimrol Ø100 (enkelrol)' });
      const ho = hb.h[0], arm = hb.arm[0];
      b.schijven(add(ho.a, mul(ho.u, 20)), ho.u, 2);
      void d1; void d2; void p1; void p2; void arm; void ho;
      b.last('Gebruiker op het kussen', 100, [0, 600, 1100], { geval: 'hyper' }); b.last('Schijven op de arm (uitgezwaaid)', this.maxLast[V.id], [0, yp + 400, 500], { geval: 'hyper' });
      b.reken('Schijfhouder', ho, 'uitkrager', 250, 0, { g: this.maxLast[V.id], proef: 'schijfhouder', las: true });
      b.reken('Slingerarm (schijven onderaan)', arm, 'uitkrager', zp - 290, 0, { g: this.maxLast[V.id], proef: 'plateLoaded', las: true });
      b.reken('Slingerarm (schijven + dynamiek)', arm, 'uitkrager', zp - 290, 0, { g: this.maxLast[V.id], proef: 'plateLoaded', las: true, dwars: true });
    },
  },
];

/** bankdrukstation: hoek 0 (vlak), 30 (schuin) of 80 (schouder); staanders aan het hoofdeinde met vaste haken */
function bankStation(b, def, { hoek, haken, zit }) {
  const V = b.V, S = b.P('staander'), a = S.b, P = b.P('bank'), Pl = b.P('bankLicht'), B = pro(b) ? 300 : 280, xs = 560 + a / 2, yh = hoek >= 60 ? 900 : hoek ? 1250 : 1200;
  const st = {};
  for (const [k, x] of [['L', -xs], ['R', xs]]) {
    b.groep('frame');
    const v = b.staaf('Voetbalk', 'staander', [x, yh - 450, a / 2], [x, yh + 400, a / 2]);
    voetjes(b, v, 2);
    const s = staander(b, 'Staander', 'staander', x, yh, a, haken[1] + 140);
    for (const z of haken) jhook(b, s, z, `Haak ${k}`, -1, true);
    hoorn(b, s, [x, yh, 420], [0, 1, 0], 230);
    st[k] = { v, s };
  }
  const dl = ligger(b, 'Dwarsligger onder', 'staander', st.L.v, st.R.v, { y: yh + 300, z: a / 2 });
  const dm = ligger(b, 'Dwarsligger midden', 'staander', st.L.s, st.R.s, { z: hoek ? 620 : 372 - P.h / 2 });
  void dl;
  let user;
  if (!hoek) {
    const v1 = voet(b, 'Voorvoet', 120, pro(b) ? 460 : 400);
    const p1 = staander(b, 'Poot', 'bank', 0, 120, P.b, 372 - P.h);
    const lig = b.staaf('Ligger', 'bank', [0, 0, 372 - P.h / 2], [0, doos(dm)[0][1], 372 - P.h / 2]);
    kussenplaat(b, lig, 0.2); kussenplaat(b, lig, 0.75);
    kussenOp(b, 'Kussen', lig, 1150, B, { op: 5, t: 0.5, schuif: (doos(dm)[0][1] - 1150) / 2 - doos(dm)[0][1] / 2 + 575 });
    void v1; void p1;
    b.reken('Ligger (gebruiker + stang uit de haken)', lig, 'ligger', doos(dm)[0][1] - 120, 0, { gk: V.gebruiker, g: def.maxLast[V.id], proef: 'extrinsiek' });
    user = [0, 700, 550];
  } else {
    const al = rad(hoek), d = [0, Math.cos(al), Math.sin(al)], n = [0, -Math.sin(al), Math.cos(al)];
    const yz = hoek >= 60 ? yh - 520 : yh - 820, zz = 460 - 73;
    const v1 = voet(b, 'Voorvoet', yz - 260, 460);
    const vl = b.staaf('Vloerligger', 'bank', [0, yz - 260 + P.h / 2, P.b + P.h / 2], [0, doos(dl)[0][1], P.b + P.h / 2]);
    const pz = staander(b, 'Zitpaal', 'bank', 0, yz, P.b + P.h, zz - Pl.h);
    const zb = b.staaf('Zitbalk', 'bankLicht', [0, yz - 170, zz - Pl.h / 2], [0, yz + 170, zz - Pl.h / 2]);
    kussenplaat(b, zb, 0.5, 160); kussenOp(b, 'Zitting', zb, 340, B, { op: 5 });
    // rugleuning van achter de zitting tot de dwarsligger midden
    const p0 = [0, yz + 180 + (P.h / 2 + 70) * Math.sin(al), zz + 40], dmTop = doos(dm);
    const L = Math.min(800, (dmTop[0][1] - P.h / 2 - p0[1]) / Math.max(0.15, Math.cos(al)));
    const rb = b.staaf('Rugleuningbalk', 'bank', p0, add(p0, mul(d, L)), { v: X, verstek: [hoek, 90 - hoek] });
    kussenSchuin(b, 'Rugleuning', rb, n, B, 0.05, 1.0);
    b.staaf('Schoor rugleuning', 'bankLicht', [0, p0[1] + 30, P.b + P.h], add(p0, mul(d, L * 0.55)), { v: X, verstek: [20, 40] });
    b.staaf('Steun rugleuning', 'bankLicht', add(p0, mul(d, L)), [0, dmTop[0][1], add(p0, mul(d, L))[2]], { v: X });
    // opstap voor de spotter achter de staanders
    b.plaat('Opstap spotter', [-300, yh + a / 2, 300], [300, yh + a / 2 + 250, 306], { opm: 'traanplaat 6 mm' });
    for (const x of [-250, 250]) staander(b, 'Poot opstap', 'licht', x, yh + a / 2 + 150, 0, 300);
    void v1; void vl; void pz;
    b.reken('Rugleuningbalk', rb, 'ligger', L * 0.55, 0, { gk: V.gebruiker * 0.6, g: def.maxLast[V.id] * 0.5, proef: 'extrinsiek' });
    user = add(p0, mul(d, 300));
  }
  const zb = haken[1];
  b.stang([-1100, yh - a / 2 - 50, zb + 14], [1100, yh - a / 2 - 50, zb + 14]);
  b.last('Gebruiker', 100, user, { geval: 'bankdrukken' }); b.last('Stang in de hoogste haken', def.maxLast[V.id], [0, yh - a / 2 - 50, zb + 14], { geval: 'bankdrukken' });
  b.reken('Staander met de hoogste haak', st.L.s, 'staanderM', zb - a, 0, { g: def.maxLast[V.id] / 2, proef: 'vanghaak', e: a / 2 + 45, las: true });
  b.reken('Haak (bodemplaat, uitkragend)', b.o.delen.find((d) => d.naam === 'Haak bodem'), 'haakplaat', 75, 0, { g: def.maxLast[V.id] / 2, proef: 'vanghaak', las: true });
  b.o.haken = { lip: 22, achter: 110 - 22 };
}
export { gat };
