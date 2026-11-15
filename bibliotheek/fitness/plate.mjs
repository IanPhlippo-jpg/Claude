// Plate-loaded machines (FP-01 .. FP-12): een hefboom op een as met glijlagers, of een slede op rails, met
// schijfhouders Ø48,3 voor olympische schijven. Maten in mm: x = breedte, y = diepte (0 = voorkant), z = hoogte.
import { staander, ligger, voetjes, kussenOp, doos, gat, X, Y, Z, balk, add, mul, sub, norm } from './bouwstenen.mjs';

const pro = (b) => b.V.id === 'pro';
const rad = (g) => (g * Math.PI) / 180;
const kruis = (a, c) => [a[1] * c[2] - a[2] * c[1], a[2] * c[0] - a[0] * c[2], a[0] * c[1] - a[1] * c[0]];

/** basis: twee vloerrails langs y (x = ±w/2) van y0 tot y1, en dwarsliggers op de gegeven y's */
function basis(b, w, y0, y1, dwars = []) {
  const P = b.P('ligger'), a = P.b;
  const r1 = b.staaf('Vloerrail', 'ligger', [-w / 2, y0, a / 2], [-w / 2, y1, a / 2]), r2 = b.staaf('Vloerrail', 'ligger', [w / 2, y0, a / 2], [w / 2, y1, a / 2]);
  voetjes(b, r1, 2); voetjes(b, r2, 2);
  const d = dwars.map((y) => ligger(b, 'Dwarsligger', 'ligger', r1, r2, { y, z: a / 2 }));
  return { r1, r2, d, a };
}
/** lageroren (2 platen) aan weerszijden van een draaipunt op een stuk; as langs x */
function lagerOren(b, piv, breed, naar, opm = 'gat voor flensglijlager') {
  const t = b.V.plaat, d = b.P('as').b + 6;
  for (const s of [-1, 1]) {
    const x = piv[0] + s * (breed / 2 + t / 2);
    const q0 = [x - t / 2, piv[1] - 45, piv[2] - 45], q1 = [x + t / 2, piv[1] + 45, piv[2] + 45];
    for (let i = 0; i < 3; i++) if (naar[i]) { if (naar[i] > piv[i]) q1[i] = naar[i]; else q0[i] = naar[i]; }
    b.plaat('Lageroor', q0, q1, { gaten: [{ p: [x, piv[1], piv[2]], d }], opm });
  }
  b.koop(b.V.lager, 2, [], { naam: `${b.V.lager === 'glij25' ? 'Flensglijlager iglidur Ø25' : 'Flensglijlager iglidur Ø30'} in de lageroren` });
}
/** lagerbok: twee palen (vanaf de vloer, met voetjes) met de lageroren ertussen; kant = -1 (palen vóór de as) of +1 (achter) */
function lagerBok(b, piv, kant = 1, z0 = 0) {
  const a = b.P('ligger').b, t = b.V.plaat, y = piv[1] + kant * (45 + a / 2), uit = [];
  for (const s of [-1, 1]) { const p = staander(b, 'Lagerpaal', 'ligger', piv[0] + s * (60 + t / 2), y, z0, piv[2] + 45); if (!z0) voetjes(b, p, 1); uit.push(p); }
  lagerOren(b, piv, 120, [0, 0, 0]);
  return uit;
}
/** hefboom: draaibus op de as (langs x), armstukken langs de punten, schijfhouder(s) en greep */
function hefboom(b, naam, piv, punten, { horen = [], greep = null, breed = 120, F = 0 } = {}) {
  const oud = b.huidig, A = b.P('hefboom'), d = b.P('bus');
  b.groep(naam);
  b.staaf(`Draaibus ${naam.toLowerCase()}`, 'bus', [piv[0] - breed / 2, piv[1], piv[2]], [piv[0] + breed / 2, piv[1], piv[2]], { kap: false, opm: 'glijlagers erin geperst' });
  const arm = [];
  let vorige = add(piv, [0, 0, 0]);
  for (const [i, p] of punten.entries()) {
    const van = i === 0 ? add(vorige, mul(norm(sub(p, vorige)), d.b / 2 - 2)) : vorige;
    arm.push(b.staaf(i ? `Hefboomarm ${naam.toLowerCase()} (deel ${i + 1})` : `Hefboomarm ${naam.toLowerCase()}`, 'hefboom', van, p, { v: X, verstek: [i ? 20 : 0, i < punten.length - 1 ? 20 : 0] }));
    vorige = p;
  }
  const h = [];
  const laatste = norm(sub(punten.at(-1), punten.length > 1 ? punten.at(-2) : piv));
  for (const { p, dir, L = 260 } of horen) {
    const dd = norm(dir), axiaal = Math.abs(dd[0] * laatste[0] + dd[1] * laatste[1] + dd[2] * laatste[2]) > 0.7, start = axiaal ? p : add(p, mul(dd, (Math.abs(dd[0]) > 0.5 ? A.b : A.h) / 2));
    h.push(b.staaf('Schijfhouder', 'sleeve', start, add(start, mul(dd, L)), { opm: 'voor schijven Ø50; eindkap' }));
    b.plaat('Kraag schijfhouder', add(start, [-dd[0] * 0 - 50 * (1 - Math.abs(dd[0])), -50 * (1 - Math.abs(dd[1])), -50 * (1 - Math.abs(dd[2]))]), add(add(start, mul(dd, 8)), [50 * (1 - Math.abs(dd[0])), 50 * (1 - Math.abs(dd[1])), 50 * (1 - Math.abs(dd[2]))]), { rond: true, opm: 'ronde kraag Ø100 x 8', in: 'schijfhouder' });
  }
  let g = null;
  if (greep) g = b.staaf('Greep', 'greep', greep[0], greep[1], { opm: 'met rubber handvat (AANNAME: krimpkous / grip)' });
  b.groep(oud);
  b.pen(`As ${naam.toLowerCase()}`, piv, X, { d: b.P('as').b, snedes: 2, a: oud, b: naam, uit: [0, -150, 120], F, factor: 'plateLoadedPen', lengte: breed + 2 * b.V.plaat + 40 });
  return { arm, h, g };
}
/** schijven op een schijfhouder (alleen 3D) */
const schijvenOp = (b, h, n = 2) => b.schijven(add(h.a, mul(h.u, 20)), h.u, n);

export const PLATE = [
  {
    id: 'FP-01', soort: 'plate', naam: 'Leg press 45°', kort: 'Slede op twee schuine rails, 4 schijfhouders.',
    uitleg: 'Een slede met voetplaat rijdt op 8 kogellagers over twee rails op 45°. Ligstoel met verstelbare rugleuning, veiligheidsgrendels aan beide kanten en eindstoppen met rubber.',
    spieren: 'quadriceps, bilspieren, hamstrings, kuiten', oefeningen: ['leg press', 'calf press', 'enkelbeens leg press'],
    maxLast: { thuis: 300, pro: 500 },
    markt: { thuis: [1000, 2500], pro: [3490, 8280], bronT: 'Tunturi LP60 € 999, ATX Leg Press 45 € 1299, Primal 3-in-1 ± € 1740, Maxxus € 1800, ATX 4inONE € 2499', bronP: 'Primal ISO Incline ± € 3490, Hammer Strength iso-lateral € 4153, Taurus Sterling € 4990, HS Linear ± € 7883' },
    bouw(b) {
      const V = b.V, P = b.P('ligger'), a = P.b, w = 640, B = basis(b, w, 0, 2200, [500, 2150]), d = [0, Math.cos(rad(45)), Math.sin(rad(45))], n = [0, -Math.sin(rad(45)), Math.cos(rad(45))];
      const p0 = [0, 700, 380], Lr = 1600, G = this.maxLast[V.id], rails = [];
      for (const s of [-1, 1]) {
        const ra = [s * w / 2, p0[1], p0[2]];
        rails.push(b.staaf('Rail 45°', 'breed', ra, add(ra, mul(d, Lr)), { v: X, verstek: [45, 45], opm: 'bovenvlak vlak geslepen (looprail)' }));
        const top = add(ra, mul(d, Lr));
        b.staaf('Achterpaal', 'ligger', [s * w / 2, top[1] - a / 2 - 2, a], [s * w / 2, top[1] - a / 2 - 2, top[2] - a / 2], {});
        b.staaf('Voorpaal', 'ligger', [s * w / 2, p0[1] + a / 2, a], [s * w / 2, p0[1] + a / 2, p0[2] - a / 2], {});
      }
      b.groep('Slede');
      const sp = add(p0, mul(d, 520)), off = mul(n, P.h / 2 + 30 + 20);
      const sl = [-1, 1].map((s) => b.staaf('Sledebalk', 'licht', add([s * w / 2, sp[1], sp[2]], off), add(add([s * w / 2, sp[1], sp[2]], off), mul(d, 650)), { v: X, verstek: [45, 0] }));
      const fp = b.staaf('Voetplaat', 'pl12x600', add(add([-(w / 2 + 40), sp[1], sp[2]], off), mul(n, 20)), add(add([w / 2 + 40, sp[1], sp[2]], off), mul(n, 20)), { v: d, opm: 'plaat 12 mm, 4 zetten voor stijfheid, antislip' });
      fp.a = add(fp.a, mul(d, -6)); fp.b = add(fp.b, mul(d, -6)); fp.geo = [balk(fp.a, fp.b, d, 12, 600)];
      const dw = b.staaf('Sledeligger', 'licht', add(add([-w / 2 + b.P('licht').b / 2, sp[1], sp[2]], off), mul(d, 600)), add(add([w / 2 - b.P('licht').b / 2, sp[1], sp[2]], off), mul(d, 600)), { v: d });
      const horen = [];
      for (const s of [-1, 1]) for (const t of [200, 520]) {
        const c = add(add([s * w / 2, sp[1], sp[2]], off), mul(d, t)), st = add(c, [s * b.P('licht').b / 2, 0, 0]);
        horen.push(b.staaf('Schijfhouder', 'sleeve', st, add(st, [s * 300, 0, 0]), {}));
        b.plaat('Kraag schijfhouder', [st[0] + (s > 0 ? 0 : -8), st[1] - 50, st[2] - 50], [st[0] + (s > 0 ? 8 : 0), st[1] + 50, st[2] + 50], { rond: true, opm: 'ronde kraag Ø100 x 8, de houder erdoor en rondom gelast', in: 'schijfhouder' });
      }
      b.groep('frame');
      const rl = rails[0].geo[0];
      const wiel = [];
      for (const s of [-1, 1]) for (const t of [40, 610]) { const c = add(add([s * w / 2, sp[1], sp[2]], mul(n, P.h / 2 + 22)), mul(d, t)); wiel.push(balk(add(c, [-12, 0, 0]), add(c, [12, 0, 0]), Y, 47, 47, true, 'zink')); }
      b.koop(V.id === 'pro' ? 'lager6204pro' : 'lager6204', 8, wiel, { naam: 'Kogellager 6204 als looprol (op een as M20 in de slede)' });
      void rl;
      for (const h of horen.slice(0, 2)) schijvenOp(b, h, 2);
      // stoel
      const vl = b.staaf('Stoelligger', 'ligger', [0, 0 + a / 2, a + P.h / 2], [0, 500 - a / 2, a + P.h / 2]);
      vl.a[2] = vl.b[2] = a / 2; vl.geo = [balk(vl.a, vl.b, X, P.b, P.h)];
      const sp1 = staander(b, 'Stoelpaal', 'ligger', 0, 250, a, 380);
      const zb = b.staaf('Zitbalk', 'bankLicht', [0, 120, 380 + b.P('bankLicht').h / 2], [0, 520, 380 + b.P('bankLicht').h / 2]);
      kussenOp(b, 'Zitting', zb, 420, 340, { op: 0 });
      const rug = b.staaf('Rugleuningbalk', 'bankLicht', [0, 140, 390], add([0, 140, 390], mul([0, -Math.cos(rad(40)), Math.sin(rad(40))], 700)), { v: X, verstek: [40, 0] });
      b.kussen('Rugleuning', add(rug.a, mul([0, -Math.sin(rad(40)), -Math.cos(rad(40))], -b.P('bankLicht').h / 2 - 0)), add(rug.b, mul([0, -Math.sin(rad(40)), -Math.cos(rad(40))], -b.P('bankLicht').h / 2)), [0, Math.sin(rad(40)), Math.cos(rad(40))], 360, 68);
      for (const s of [-1, 1]) b.staaf('Handgreep', 'greep', [s * (b.P('bankLicht').b / 2), 330, 400], [s * 300, 330, 400], {});
      void sp1; void dw;
      b.reken('Rail tussen de palen (slede met schijven, per rail)', rails[0], 'ligger', Lr, 0, { g: G / 2 + 30, proef: 'plateLoaded' });
      b.reken('Schijfhouder', horen[0], 'uitkrager', 300, 0, { g: G / 4, proef: 'schijfhouder', las: true });
      b.reken('Sledebalk (voetplaat tot looprollen)', sl[0], 'ligger', 570, 0, { gk: V.gebruiker / 2, g: G / 2, proef: 'plateLoaded' });
      b.last('Gebruiker in de stoel', 100, [0, 200, 600], { geval: 'press' }); b.last('Slede met schijven (hoog)', G + 60, add(p0, mul(d, 1100)), { geval: 'press' });
      b.spleet('Slede - rail (looprollen)', 20, { uitleg: 'de slede rijdt 20 mm boven de rail: geen knelpunt tussen 9,5 en 25? kap over de rollen', kap: true });
      b.o.veiligheid = 'veiligheidsgrendels in 6 standen en een eindstop met rubber onderaan de rails';
    },
  },
  {
    id: 'FP-02', soort: 'plate', naam: 'Hack squat', kort: 'Slede met rug- en schouderkussens op rails van 45°.',
    uitleg: 'Je staat op een schuine voetplaat met je rug tegen de slede; de slede met schouderkussens loopt op 8 looprollen over twee rails op 45°. Veiligheidshendel en eindstoppen.',
    spieren: 'quadriceps, bilspieren', oefeningen: ['hack squat', 'reverse hack squat', 'calf raise in de machine'],
    maxLast: { thuis: 200, pro: 350 },
    markt: { thuis: [1000, 1800], pro: [3250, 8280], bronT: 'ATX Compact Leg Press/Hack € 999, Taurus Hack-squat IFP € 1499, Maxxus 2-in-1 € 1800', bronP: 'Primal ISO Hack V-Squat ± € 3250, Hammer Strength Plate-Loaded Hack Squat ± € 7883' },
    bouw(b) {
      const V = b.V, P = b.P('ligger'), a = P.b, w = 560, G = this.maxLast[V.id], al = rad(45), d = [0, -Math.cos(al), Math.sin(al)], n = [0, Math.sin(al), Math.cos(al)];
      basis(b, w, 0, 1900, [150, 1850]);
      const p0 = [0, 1500, 300], Lr = 1600, rails = [];
      for (const s of [-1, 1]) {
        const ra = [s * w / 2, p0[1], p0[2]];
        rails.push(b.staaf('Rail 45°', 'ligger', ra, add(ra, mul(d, Lr)), { v: X, verstek: [45, 45] }));
        const top = add(ra, mul(d, Lr));
        b.staaf('Voorpaal', 'ligger', [s * w / 2, top[1] + a / 2 + 2, a], [s * w / 2, top[1] + a / 2 + 2, top[2] - a / 2], {});
        b.staaf('Achterpaal', 'ligger', [s * w / 2, p0[1] - a / 2, a], [s * w / 2, p0[1] - a / 2, p0[2] - a / 2], {});
      }
      // voetplaat vast onderaan, schuin (20°)
      b.plaat('Voetplaat', [-350, 1550, 230], [350, 1950, 242], { opm: 'traanplaat 12 mm op twee schuine steunen (20°)' });
      for (const s of [-1, 1]) b.staaf('Steun voetplaat', 'licht', [s * 250, 1600, a], [s * 250, 1600, 230], {});
      b.groep('Slede');
      const sp = add(p0, mul(d, 600)), off = mul(n, P.h / 2 + 50);
      const sl = [-1, 1].map((s) => b.staaf('Sledebalk', 'licht', add([s * w / 2, sp[1], sp[2]], off), add(add([s * w / 2, sp[1], sp[2]], off), mul(d, 800)), { v: X }));
      const dw = [200, 760].map((t) => b.staaf('Sledeligger', 'licht', add(add([-w / 2 + b.P('licht').b / 2, sp[1], sp[2]], off), mul(d, t)), add(add([w / 2 - b.P('licht').b / 2, sp[1], sp[2]], off), mul(d, t)), { v: d }));
      const rb = b.staaf('Rugbalk', 'bankLicht', add(add([0, sp[1], sp[2]], off), add(mul(d, 80), mul(n, b.P('licht').h / 2 + b.P('bankLicht').h / 2))), add(add([0, sp[1], sp[2]], off), add(mul(d, 760), mul(n, b.P('licht').h / 2 + b.P('bankLicht').h / 2))), { v: X });
      b.kussen('Rugkussen', add(rb.a, mul(n, b.P('bankLicht').h / 2)), add(rb.b, mul(n, b.P('bankLicht').h / 2)), n, 340, 68);
      const horen = [];
      for (const s of [-1, 1]) { const c = add(add([s * w / 2, sp[1], sp[2]], off), mul(d, 120)), st = add(c, [s * b.P('licht').b / 2, 0, 0]); horen.push(b.staaf('Schijfhouder', 'sleeve', st, add(st, [s * 300, 0, 0]), {})); b.plaat('Kraag schijfhouder', [st[0] + (s > 0 ? 0 : -8), st[1] - 50, st[2] - 50], [st[0] + (s > 0 ? 8 : 0), st[1] + 50, st[2] + 50], { rond: true, opm: 'ronde kraag Ø100 x 8', in: 'schijfhouder' }); }
      for (const s of [-1, 1]) { const c = add(add([s * 120, sp[1], sp[2]], off), add(mul(d, 800), mul(n, 120))); b.kussen('Schouderkussen', c, add(c, mul(d, -160)), n, 120, 68); }
      b.groep('frame');
      const wiel = [];
      for (const s of [-1, 1]) for (const t of [60, 740]) { const c = add(add([s * w / 2, sp[1], sp[2]], mul(n, P.h / 2 + 22)), mul(d, t)); wiel.push(balk(add(c, [-12, 0, 0]), add(c, [12, 0, 0]), Y, 47, 47, true, 'zink')); }
      b.koop(V.id === 'pro' ? 'lager6204pro' : 'lager6204', 8, wiel, { naam: 'Kogellager 6204 als looprol' });
      for (const h of horen) schijvenOp(b, h, 2);
      void sl; void dw;
      b.reken('Rail tussen de palen', rails[0], 'ligger', Lr, 0, { gk: V.gebruiker / 2, g: G / 2, proef: 'plateLoaded' });
      b.reken('Schijfhouder', horen[0], 'uitkrager', 300, 0, { g: G / 2, proef: 'schijfhouder', las: true });
      b.last('Gebruiker op de voetplaat', 100, [0, 1700, 1100], { geval: 'squat' }); b.last('Slede + schijven', G + 50, add(p0, mul(d, 900)), { geval: 'squat' });
    },
  },
  {
    id: 'FP-03', soort: 'plate', naam: 'Belt squat', kort: 'Hefboom met heupgordel boven een platform.',
    uitleg: 'Je staat op een platform en draagt een heupgordel aan een ketting aan de hefboom: geen druk op de rug. De hefboom draait achteraan; vooraan handgrepen.',
    spieren: 'quadriceps, bilspieren, adductoren', oefeningen: ['belt squat', 'belt squat march', 'deadlift met gordel'],
    maxLast: { thuis: 200, pro: 300 },
    markt: { thuis: [1000, 2200], pro: [2330, 6600], bronT: 'Taurus Belt Squat IFP € 999, ATX Belt Squat € 1580-1990', bronP: 'Primal commercial belt squat ± € 2330, Rogue Monster Rhino € 3046, Hammer Strength PL Belt Squat ± € 5656-6284' },
    bouw(b) {
      const V = b.V, P = b.P('ligger'), a = P.b, w = 800, G = this.maxLast[V.id];
      const B = basis(b, w, 0, 1800, [80, 900, 1720]);
      b.plaat('Platform', [-w / 2 + a / 2, 150, a], [w / 2 - a / 2, 850, a + 8], { opm: 'traanplaat 8 mm' });
      const piv = [0, 1650, 450];
      for (const s of [-1, 1]) staander(b, 'Lagerpaal', 'ligger', s * (60 + b.V.plaat / 2), piv[1] + 45 + a / 2, a, piv[2] + 45);
      lagerOren(b, piv, 120, [0, 0, 0]);
      const hb = hefboom(b, 'Hefboom', piv, [[0, 1250, 620], [0, 450, 650]], { horen: [{ p: [0, 450, 650], dir: [1, 0, 0] }, { p: [0, 450, 650], dir: [-1, 0, 0] }], breed: 120, F: G });
      b.staaf('Haak gordelketting', 'r20', [0, 520, 650 - b.P('hefboom').h / 2], [0, 520, 560], { groep: 'Hefboom', opm: 'oog voor de ketting' });
      for (const s of [-1, 1]) { const sp = staander(b, 'Handgreeppaal', 'licht', s * (w / 2), 150, a, 1100); b.staaf('Handgreep', 'greep', [s * (w / 2 - b.P('licht').b / 2), 150, 1080], [s * 250, 150, 1080], {}); void sp; }
      for (const h of hb.h) schijvenOp(b, h, 2);
      b.reken('Hefboomarm (tussen as en gordelhaak)', hb.arm[0], 'ligger', 1150, 0, { g: G, proef: 'plateLoaded', gk: V.gebruiker * 0.3 });
      b.reken('Schijfhouder', hb.h[0], 'uitkrager', 260, 0, { g: G / 2, proef: 'schijfhouder', las: true });
      b.last('Gebruiker op het platform', 100, [0, 500, 1000], { geval: 'squat' }); b.last('Schijven', G, [0, 450, 700], { geval: 'squat' });
      void B;
    },
  },
  {
    id: 'FP-04', soort: 'plate', naam: 'Chest press iso-lateraal', kort: 'Twee aparte hefbomen met hoge as en greep voor de borst.',
    uitleg: 'Zitting en rugleuning; twee aparte hefbomen draaien op een as boven en achter de gebruiker en komen met de greep voor de borst. Elke arm heeft een schijfhouder.',
    spieren: 'borst, voorste schouder, triceps', oefeningen: ['chest press', 'enkelarmige chest press'],
    maxLast: { thuis: 160, pro: 250 },
    markt: { thuis: [800, 1600], pro: [2490, 5420], bronT: 'Taurus Seated Chest Press IFP € 799, ATX Chest Press € 1299-1450, Tunturi Platinum Chest Press PL € 1599', bronP: 'Taurus Iso Chest Press Sterling € 2490, Hammer Strength Iso-Lateral Bench Press € 5420' },
    bouw(b) { isoMachine(b, this, 'chest'); },
  },
  {
    id: 'FP-05', soort: 'plate', naam: 'Seated row met borststeun', kort: 'Iso-laterale roeimachine met borstkussen.',
    uitleg: 'Je zit met je borst tegen een kussen en trekt twee aparte hefbomen naar je toe. De as zit vooraan boven; de schijfhouders hangen aan de armen.',
    spieren: 'midden van de rug, brede rugspier, biceps, achterste schouder', oefeningen: ['seated row', 'enkelarmige row'],
    maxLast: { thuis: 160, pro: 250 },
    markt: { thuis: [900, 1500], pro: [2490, 4220], bronT: 'Taurus Seated Row IFP € 899, Steelflex PLSR € 1295, Tunturi Platinum Seated Row PL € 1499', bronP: 'Taurus Iso Low Row Sterling € 2490, Hammer Strength Iso-Lateral Row ± € 4220' },
    bouw(b) { isoMachine(b, this, 'row'); },
  },
  {
    id: 'FP-06', soort: 'plate', naam: 'T-bar row met borststeun', kort: 'Schuin borstkussen, hefboom met dwarsgreep.',
    uitleg: 'Je staat op een voetplaat en ligt met je borst op een schuin kussen. De hefboom draait vooraan bij de vloer en heeft een dwarsgreep (breed en smal) en een schijfhouder.',
    spieren: 'midden van de rug, brede rugspier, biceps', oefeningen: ['chest supported T-bar row'],
    maxLast: { thuis: 150, pro: 220 },
    markt: { thuis: [500, 1200], pro: [1300, 2330], bronT: 'ATX T-Bar Row € 499-677, Taurus T-Bar Row € 699, Tunturi Platinum Adj. T-bar Row € 1199', bronP: 'Taurus Incline Row/T-Bar Sterling € 1299, Primal Club Incline T-Bar Row ± € 2330' },
    bouw(b) {
      const V = b.V, P = b.P('ligger'), a = P.b, G = this.maxLast[V.id], w = 480;
      basis(b, w, 0, 1700, [100, 900, 1620]);
      const piv = [0, 160, a + 80];
      lagerOren(b, piv, 120, [0, 0, a]);
      const zg = piv[2] + ((420 - piv[2]) * (1050 - piv[1])) / (1350 - piv[1]);
      const hb = hefboom(b, 'Hefboom', piv, [[0, 1350, 420]], { horen: [{ p: [0, 1350, 420], dir: [0, 1, 0.235], L: 250 }], breed: 120, greep: [[-280, 1050, zg], [280, 1050, zg]], F: G });
      const pk = staander(b, 'Kussenpaal', 'ligger', 0, 900, a, 900);
      void pk;
      const al = rad(40), dd = [0, Math.cos(al), Math.sin(al)], n = [0, -Math.sin(al), Math.cos(al)];
      const kb = b.staaf('Kussenbalk', 'bankLicht', [0, 900 - P.h / 2, 900], add([0, 900 - P.h / 2, 900], mul(dd, 450)), { v: X, verstek: [40, 0] });
      b.kussen('Borstkussen', add(kb.a, mul(n, b.P('bankLicht').h / 2)), add(kb.b, mul(n, b.P('bankLicht').h / 2)), n, 320, 68);
      b.plaat('Voetplaat', [-250, 1300, a], [250, 1600, a + 8], { opm: 'traanplaat 8 mm' });
      schijvenOp(b, hb.h[0], 2);
      b.reken('Hefboomarm (de schijven hangen 300 mm voorbij de greep)', hb.arm[0], 'uitkrager', 300, 0, { g: G, proef: 'plateLoaded', las: true });
      b.reken('Schijfhouder', hb.h[0], 'uitkrager', 250, 0, { g: G, proef: 'schijfhouder', las: true });
      b.last('Gebruiker op het kussen', 100, [0, 1200, 1000], { geval: 'row' }); b.last('Schijven', G, [0, 1500, 500], { geval: 'row' });
    },
  },
  {
    id: 'FP-07', soort: 'plate', naam: 'Seated calf raise', kort: 'Kniekussen op een hefboom, voetblok en zitting.',
    uitleg: 'Je zit met je knieën onder een kussen op de hefboom en duwt met de voorvoet op een blok omhoog. De hefboom draait vooraan; de schijfhouder zit erachter. Met een veiligheidshendel.',
    spieren: 'kuiten (soleus)', oefeningen: ['seated calf raise', 'tibialis raise (omgekeerd)'],
    maxLast: { thuis: 120, pro: 200 },
    markt: { thuis: [400, 500], pro: [1160, 2470], bronT: 'ATX Seated Calf Raise € 399, Taurus Seated Calf Raise IFP € 499', bronP: 'Primal PL Seated Calf ± € 1160, Hammer Strength PL Seated Calf ± € 2117-2352' },
    bouw(b) {
      const V = b.V, P = b.P('ligger'), a = P.b, G = this.maxLast[V.id], w = 420;
      const piv = [0, 120, 520];
      basis(b, w, 0, 1100, [piv[1] - 45 - a / 2, 700]);
      lagerBok(b, piv, -1, a);
      const hb = hefboom(b, 'Hefboom', piv, [[0, 520, 560], [0, 950, 560]], { horen: [{ p: [0, 950, 560], dir: [1, 0, 0], L: 260 }], breed: 120, F: G });
      b.kussen('Kniekussen', [-170, 470, 560 - b.P('hefboom').h / 2], [170, 470, 560 - b.P('hefboom').h / 2], [0, 0, -1], 120, 60);
      b.plaat('Voetblok', [-200, 420, a], [200, 560, a + 90], { opm: 'blok: koker 140x90 met antislip bovenop' });
      const zp = staander(b, 'Zitpaal', 'ligger', 0, 700 + 0, a, 400);
      const zb = b.staaf('Zitbalk', 'bankLicht', [0, 600, 400 + b.P('bankLicht').h / 2], [0, 860, 400 + b.P('bankLicht').h / 2]);
      kussenOp(b, 'Zitting', zb, 300, 320, { op: 0 });
      schijvenOp(b, hb.h[0], 2);
      void zp;
      b.reken('Hefboomarm (van het kniekussen tot de schijven)', hb.arm[0], 'uitkrager', 480, 0, { g: G, proef: 'plateLoaded', las: true });
      b.reken('Schijfhouder', hb.h[0], 'uitkrager', 260, 0, { g: G, proef: 'schijfhouder', las: true });
      b.last('Gebruiker', 100, [0, 700, 700], { geval: 'calf' }); b.last('Schijven', G, [150, 950, 560], { geval: 'calf' });
    },
  },
  {
    id: 'FP-08', soort: 'plate', naam: 'Pulldown iso-lateraal', kort: 'Twee hefbomen boven het hoofd, dijkussen.',
    uitleg: 'Zitting met dijkussen; twee aparte hefbomen draaien op een as achteraan boven. Je trekt de grepen naar beneden; de schijven zitten achter de as.',
    spieren: 'brede rugspier, biceps', oefeningen: ['iso-lateral pulldown', 'enkelarmige pulldown'],
    maxLast: { thuis: 160, pro: 240 },
    markt: { thuis: [1200, 1700], pro: [2490, 4340], bronT: 'Taurus Lat Pulldown IFP € 1199, Tunturi Platinum Wide Lat Pulldown PL € 1699', bronP: 'Taurus Iso Lat-Pulldown Sterling € 2490, Primal ISO Front Pulldown ± € 4190, Hammer Strength ± € 4340' },
    bouw(b) { isoMachine(b, this, 'pulldown'); },
  },
  {
    id: 'FP-09', soort: 'plate', naam: 'Schouderdrukmachine', kort: 'Iso-laterale schouderpers met rechte rugleuning.',
    uitleg: 'Zitting en rugleuning (80°); twee aparte hefbomen draaien achter de rugleuning laag en brengen de grepen boven de schouders. Schijfhouders aan de armen.',
    spieren: 'schouders, triceps', oefeningen: ['shoulder press', 'enkelarmige press'],
    maxLast: { thuis: 120, pro: 200 },
    markt: { thuis: [1000, 1500], pro: [2290, 4340], bronT: 'Taurus Seated Shoulder Press IFP € 999, Tunturi Platinum Shoulder Press PL € 1499', bronP: 'Taurus Iso Shoulder Press Sterling € 2290, Primal ISO ± € 2330, Hammer Strength ± € 4135' },
    bouw(b) { isoMachine(b, this, 'shoulder'); },
  },
  {
    id: 'FP-10', soort: 'plate', naam: 'Hip thrust machine', kort: 'Rugkussen en een heupkussen op een hefboom.',
    uitleg: 'Je ligt met je bovenrug op een kussen; een hefboom met heupkussen draait vooraan bij de vloer. Schijfhouders aan weerszijden van de hefboom, voetplaat vooraan.',
    spieren: 'bilspieren, hamstrings', oefeningen: ['hip thrust', 'glute bridge'],
    maxLast: { thuis: 200, pro: 300 },
    markt: { thuis: [1000, 1500], pro: [1500, 5150], bronT: 'Taurus Hip Thrust IFP € 999, Tunturi Platinum Hip Thrust PL € 1399-1499', bronP: 'Taurus Iso Hip Thruster Sterling € 1499, Primal Standing Hip Thrust ± € 1980, Hammer Strength Glute Drive ± € 4416-4907' },
    bouw(b) {
      const V = b.V, P = b.P('ligger'), a = P.b, G = this.maxLast[V.id], w = 640;
      basis(b, w, 0, 1500, [180 - 45 - a / 2, 1200, 1420]);
      const rb = b.staaf('Rugkussenligger', 'ligger', [-w / 2 + a / 2, 1200, 420], [w / 2 - a / 2, 1200, 420], { v: Y });
      for (const s of [-1, 1]) staander(b, 'Poot rugkussen', 'ligger', s * 200, 1200, a, 420 - P.h / 2);
      kussenOp(b, 'Rugkussen', rb, w - a, 260, { op: 0, n: Z });
      const piv = [0, 180, 300];
      lagerBok(b, piv, -1, a);
      const hb = hefboom(b, 'Hefboom', piv, [[0, 850, 520]], { horen: [{ p: [0, 750, 485], dir: [1, 0, 0] }, { p: [0, 750, 485], dir: [-1, 0, 0] }], breed: 120, F: G });
      b.kussen('Heupkussen', [-200, 850, 520 + b.P('hefboom').h / 2], [200, 850, 520 + b.P('hefboom').h / 2], [0, -0.2, 1], 160, 80);
      b.plaat('Voetplaat', [-300, 260, a], [300, 560, a + 8], { opm: 'traanplaat 8 mm, op twee dwarsstrips' });
      for (const y of [290, 530]) b.staaf('Dwarsstrip voetplaat', 's50x8', [-w / 2 + a / 2, y, a / 2], [w / 2 - a / 2, y, a / 2], { v: Z, opm: 'tussen de vloerrails' });
      for (const h of hb.h) schijvenOp(b, h, 2);
      b.reken('Hefboomarm (tussen as en heupkussen, schijven ertussen)', hb.arm[0], 'ligger', 560, 0, { g: G, proef: 'plateLoaded' });
      b.reken('Rugkussenligger', rb, 'ligger', 400, 0, { gk: V.gebruiker * 0.5, proef: 'extrinsiek' });
      b.last('Gebruiker', 100, [0, 900, 600], { geval: 'thrust' }); b.last('Schijven', G, [0, 750, 600], { geval: 'thrust' });
    },
  },
  {
    id: 'FP-11', soort: 'plate', naam: 'Smithmachine', kort: 'Geleide stang op twee stangen Ø25 met lineaire lagers.',
    uitleg: 'Een stalen kader met twee verticale geleidestangen Ø25 h6; de stang rijdt op 4 lineaire lagers. Haken om de stang op te hangen in elke positie (draaien), verstelbare eindstoppen en een optrekstang.',
    spieren: 'benen, borst, schouders', oefeningen: ['smith squat', 'bankdrukken', 'shoulder press', 'calf raise', 'hip thrust'],
    maxLast: { thuis: 160, pro: 250 },
    markt: { thuis: [700, 1500], pro: [3500, 7820], bronT: 'Taurus MS3 Smith € 699, Gorilla Smith met Half Rack € 850, Taurus MS20 Pro € 1499', bronP: 'BodyCraft Jones Commercial € 3499, Taurus Elite € 3999, Hammer Strength Vertical Smith ± € 7442' },
    bouw(b) {
      const V = b.V, S = b.P('staander'), a = S.b, H = 2200, wi = 1300, xs = wi / 2 + a / 2, G = this.maxLast[V.id], st = {};
      for (const [k, x] of [['L', -xs], ['R', xs]]) {
        b.groep('frame');
        const v = b.staaf('Voetbalk', 'voet', [x, 0, a / 2], [x, 1100, a / 2]);
        voetjes(b, v, 2);
        st[k] = { v, f: staander(b, 'Staander voor', 'staander', x, 250, a, H), b: staander(b, 'Staander achter', 'staander', x, 850, a, H) };
        ligger(b, 'Bovenligger zijkant', 'ligger', st[k].f, st[k].b, { z: H - a / 2 });
        ligger(b, 'Onderligger zijkant', 'ligger', st[k].f, st[k].b, { z: a + 40 + a / 2 });
      }
      ligger(b, 'Optrekstang', 'stang', st.L.f, st.R.f, { z: H - 30 }, { bout: true, groep: 'Optrekstang' });
      ligger(b, 'Bovenligger achter', 'ligger', st.L.b, st.R.b, { z: H - a / 2 }, { bout: true, groep: 'Bovenligger achter' });
      ligger(b, 'Onderligger achter', 'ligger', st.L.v, st.R.v, { y: 1000, z: a / 2 }, { bout: true, groep: 'Onderligger achter', flens: a });
      // geleidestangen tussen de onderligger en de bovenligger van elke zijkant
      const yg = 550, xg = xs;
      for (const [k, x] of [['L', -xg], ['R', xg]]) {
        b.koop('stang25', 1, [balk([x, yg, 2 * a + 40], [x, yg, H - a], X, 25, 25, true, 'chroom')], { naam: `Geleidestang Ø25 h6, ${H - 3 * a - 40} mm`, meter: (H - 3 * a - 40) / 1000 });
        b.plaat(`Stangklem ${k} onder`, [x - a / 2, yg - 40, 2 * a + 40], [x + a / 2, yg + 40, 2 * a + 48], { gaten: [{ p: [x, yg, 2 * a + 40], d: 25 }], opm: 'klemt de stang met een M8 dwarsbout' });
        void k;
      }
      b.groep('Slede');
      const zs = 1300, D = b.P('b60x3');
      for (const x of [-xg, xg]) b.staaf('Lagerhuis', 'b60x3', [x, yg, zs - 100], [x, yg, zs + 100], { in: 'stang', kap: false, opm: '2 lineaire lagers LM25UU erin geperst' });
      const sb = b.staaf('Halterstang smith', 'stang', [-xg + D.b / 2, yg, zs], [xg - D.b / 2, yg, zs], { opm: `massief ${b.P('stang').naam}${pro(b) ? ' S355J2' : ''} met kartel` });
      if (pro(b)) sb.P = { ...sb.P, fy: 355, naam: 'rond Ø38 S355J2' };
      for (const s of [-1, 1]) b.staaf('Schijfhouder', 'sleeve', [s * (xg + D.b / 2), yg, zs], [s * (xg + D.b / 2 + 300), yg, zs], {});
      for (const s of [-1, 1]) b.plaat('Haak smith', [s * (xg - D.b / 2) - (s > 0 ? 40 : 0), yg + D.b / 2, zs - 20], [s * (xg - D.b / 2) + (s > 0 ? 0 : 40), yg + D.b / 2 + 60, zs + 6], { opm: 'haak die in de pennen van de staander valt als je de stang draait' });
      b.groep('frame');
      b.koop(V.lineair, 4, [], { naam: `${V.lineair === 'lm25' ? 'Lineair lager LM25UU' : 'Lineaire glijbus igus RJUM-01-25'} in de lagerhuizen` });
      for (const s of [-1, 1]) b.schijven([s * (xg + D.b / 2 + 20), yg, zs], [s, 0, 0], 2);
      for (const S2 of [st.L.b, st.R.b]) for (let z = 400; z <= 1800; z += 100) b.staaf('Haakpen', pro(b) ? 'r30' : 'r25', [S2.a[0], 850 - a / 2, z], [S2.a[0], 850 - a / 2 - 50, z], { kap: false, opm: 'pen waar de haak in valt' });
      b.reken('Halterstang (schijven buiten het lagerhuis, per kant)', sb, 'uitkrager', 210, 0, { g: G / 2, proef: 'vanghaak' });
      b.reken('Haakpen (stang hangt aan 2 haken)', b.o.delen.find((d) => d.naam === 'Haakpen'), 'uitkrager', 40, 0, { g: G / 2, proef: 'vanghaak', las: true });
      b.last('Gebruiker', 100, [0, 400, 1000], { geval: 'squat' }); b.last('Stang + schijven', G + 20, [0, yg, zs], { geval: 'squat' });
      b.o.veiligheid = 'haken in elke 100 mm en verstelbare eindstoppen (veiligheidsklem) op de geleidestangen';
    },
  },
  {
    id: 'FP-12', soort: 'plate', naam: 'Leg extension / leg curl (schijven)', kort: 'Combinatie beenstrekker en -buiger met schijfhouder.',
    uitleg: 'Een zitbank met rugleuning en een hefboom op kniehoogte met twee rollen: met de voorste rol strek je, met de achterste (dijklem op) buig je. De schijfhouder staat schuin naar achter op de hefboom.',
    spieren: 'quadriceps, hamstrings', oefeningen: ['leg extension', 'leg curl zittend'],
    maxLast: { thuis: 80, pro: 120 },
    markt: { thuis: [740, 1170], pro: [2290, 4110], bronT: 'ATX Leg Combo Chair € 736, ATX BCO-680 € 899-1168, Taurus IFP € 799-899', bronP: 'Taurus Iso Leg Extension € 2290, Leg Curl Sterling € 2490, Primal PL ± € 2330, Hammer Strength ± € 3914' },
    bouw(b) {
      const V = b.V, P = b.P('ligger'), a = P.b, G = this.maxLast[V.id], w = 460;
      basis(b, w, 0, 1250, [150, 380 - 45 - a / 2, 650, 900, 1150]);
      const vl = null;
      const zp = staander(b, 'Zitpaal', 'ligger', 0, 650, a, 410);
      const zb = b.staaf('Zitbalk', 'bankLicht', [0, 450, 410 + b.P('bankLicht').h / 2], [0, 820, 410 + b.P('bankLicht').h / 2]);
      kussenOp(b, 'Zitting', zb, 380, 320, { op: 0 });
      const rp = staander(b, 'Rugpaal', 'bank', 0, 900, a, 1050);
      b.kussen('Rugleuning', [0, 900 - b.P('bank').h / 2, 560], [0, 900 - b.P('bank').h / 2, 1050], [0, -1, 0], 320, 68);
      const piv = [0, 380, 560];
      const [lp] = lagerBok(b, piv, -1, a);
      const hb = hefboom(b, 'Hefboom', piv, [[0, 330, 120]], { horen: [{ p: [0, 330, 120], dir: [0, 1, 0.6], L: 260 }], breed: 120, F: G });
      b.staaf('As rol', 'as', [-200, 330, 120], [200, 330, 120], { groep: 'Hefboom', kap: false, in: 'hefboom' });
      b.koop(V.schuimrol, 2, [-1, 1].map((s) => balk([s * 30, 330, 120], [s * 230, 330, 120], X, 100, 100, true, 'leer')), { naam: 'Schuimrol Ø100' });
      for (const s of [-1, 1]) b.staaf('Handgreep', 'greep', [s * (a / 2), 650, 380], [s * 280, 650, 380], {});
      schijvenOp(b, hb.h[0], 2);
      void vl; void zp; void rp; void lp; void piv;
      b.reken('Hefboomarm', hb.arm[0], 'uitkrager', 450, 0, { g: G, proef: 'plateLoaded', las: true });
      b.reken('Lagerpaal', lp, 'staanderM', 560, 0, { g: G / 2, proef: 'plateLoaded', e: 100, las: true });
      b.last('Gebruiker', 100, [0, 650, 700], { geval: 'been' }); b.last('Schijven (hoog)', G, [0, 500, 400], { geval: 'been' });
    },
  },
];

/** iso-laterale machines met twee hefbomen: chest, row, pulldown, shoulder */
function isoMachine(b, def, soort) {
  const V = b.V, P = b.P('ligger'), a = P.b, G = def.maxLast[V.id], w = 900, half = G / 2;
  basis(b, w, 0, 1500, [100, 1400]);
  const vl = b.staaf('Middenligger', 'ligger', [0, 100 + a / 2, a / 2], [0, 1400 - a / 2, a / 2]);
  const cfg = {
    chest: { piv: [0, 1250, 1450], zit: [700, 450], rug: [960, 80], greep: [0, 420, 1050], hoorn: [0, 1000, 1500], hoornDir: [0, 1, 0] },
    row: { piv: [0, 250, 1500], zit: [900, 480], borst: [650, 1000], greep: [0, 560, 1050], hoorn: [0, 450, 1100], hoornDir: [0, 0, -1] },
    pulldown: { piv: [0, 1150, 1950], zit: [600, 480], dijk: [335, 640], greep: [0, 520, 1700], hoorn: [0, 1350, 2000], hoornDir: [0, 1, 0] },
    shoulder: { piv: [0, 1200, 650], zit: [700, 480], rug: [960, 80], greep: [0, 720, 1300], hoorn: [0, 1150, 1250], hoornDir: [0, 1, 0] },
  }[soort];
  // portaal met de as: twee palen (x = ±w/2) en een ligger erover
  const yp = cfg.piv[1], zp = cfg.piv[2];
  const pL = staander(b, 'Portaalpaal', 'ligger', -w / 2, yp, a, zp + 50 + a), pR = staander(b, 'Portaalpaal', 'ligger', w / 2, yp, a, zp + 50 + a);
  const pt = ligger(b, 'Portaalligger', 'ligger', pL, pR, { z: zp + 50 + a / 2 });
  // zitting
  const zp1 = staander(b, 'Zitpaal', 'ligger', 0, cfg.zit[0], a, cfg.zit[1] - 73 - b.P('bankLicht').h);
  const zb = b.staaf('Zitbalk', 'bankLicht', [0, cfg.zit[0] - 200, cfg.zit[1] - 73 - b.P('bankLicht').h / 2], [0, cfg.zit[0] + 200, cfg.zit[1] - 73 - b.P('bankLicht').h / 2]);
  kussenOp(b, 'Zitting', zb, 380, 340, { op: 0 });
  if (cfg.rug) { const rp = staander(b, 'Rugpaal', 'bank', 0, cfg.rug[0], a, 1200); b.kussen('Rugleuning', [0, cfg.rug[0] - b.P('bank').h / 2, 560], [0, cfg.rug[0] - b.P('bank').h / 2, 1200], [0, -1, 0], 320, 68); void rp; }
  if (cfg.borst) { const kp = staander(b, 'Kussenpaal', 'bank', 0, cfg.borst[0], a, cfg.borst[1] + 250); b.kussen('Borstkussen', [0, cfg.borst[0] + b.P('bank').h / 2, cfg.borst[1] - 150], [0, cfg.borst[0] + b.P('bank').h / 2, cfg.borst[1] + 250], [0, 1, 0], 300, 68); void kp; }
  if (cfg.dijk) { const dp = staander(b, 'Dijkpaal', 'bank', 0, cfg.dijk[0], a, cfg.dijk[1]); b.staaf('As dijkrollen', 'as', [-200, cfg.dijk[0], cfg.dijk[1] - 20], [200, cfg.dijk[0], cfg.dijk[1] - 20], { kap: false, in: dp.id }); b.koop(V.schuimrol, 2, [-1, 1].map((s) => balk([s * 40, cfg.dijk[0], cfg.dijk[1] - 20], [s * 240, cfg.dijk[0], cfg.dijk[1] - 20], X, 100, 100, true, 'leer')), { naam: 'Schuimrol Ø100 (dijklem)' }); void dp; }
  const arms = [];
  const pmn = doos(pt);
  for (const [k, s] of [['L', -1], ['R', 1]]) {
    const piv = [s * 260, yp, zp];
    lagerOren(b, piv, 120, [0, 0, pmn[0][2]]);
    const g0 = [s * 230, cfg.greep[1], cfg.greep[2]];
    const hb = hefboom(b, `Hefboom ${k}`, piv, [[s * 260, cfg.hoorn[1], cfg.hoorn[2]], [s * 260, g0[1], g0[2]]], { horen: [{ p: [s * 260, cfg.hoorn[1], cfg.hoorn[2]], dir: [s, 0, 0], L: 260 }], breed: 120, greep: [[s * 260 - s * b.P('hefboom').b / 2, g0[1], g0[2]], [s * 110, g0[1], g0[2]]], F: half });
    arms.push(hb);
    schijvenOp(b, hb.h[0], 2);
  }
  void vl;
  b.reken('Hefboomarm (moment van de schijven rond de as)', arms[0].arm[0], 'uitkrager', Math.hypot(cfg.hoorn[1] - yp, cfg.hoorn[2] - zp), 0, { g: half, proef: 'plateLoaded', las: true });
  b.reken('Schijfhouder', arms[0].h[0], 'uitkrager', 260, 0, { g: half, proef: 'schijfhouder', las: true });
  b.reken('Portaalligger (beide hefbomen)', pt, 'ligger', w - a, 0, { g: G, proef: 'plateLoaded' });
  b.last('Gebruiker', 100, [0, cfg.zit[0], 800], { geval: 'iso' }); b.last('Schijven op beide armen', G, [0, cfg.hoorn[1], cfg.hoorn[2]], { geval: 'iso' });
}
export { lagerOren, hefboom, gat, sub, kruis };
