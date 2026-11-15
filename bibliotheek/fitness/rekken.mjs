// Rekken en racks (FR-01 .. FR-14): elk toestel bouwt zichzelf in de thuis- of de proversie met de bouwstenen.
// Maten in mm: x = breedte, y = diepte (0 = voorkant), z = hoogte. Marktprijzen incl. btw (docs/Marktprijzen.md).
import { staander, ligger, dwarsOp, jhook, safety, hoorn, voetjes, gatZ, westside, doos, gat, X, Y, Z, balk } from './bouwstenen.mjs';

/** Westside-gaten op een staander die op z0 begint: van 300 tot H - 150, bankzone 400-1000 om de 25 mm */
const ws = (b, z0, H) => ({ gaten: westside(300 - z0, 400 - z0, 1000 - z0, H - 150 - z0, b.V.gat), westside: { d: b.V.gat } });
const pro = (b) => b.V.id === 'pro';
/** ankers in een voetbalk (verticale gaten) en de keilbouten */
function ankers(b, S, n = 2) {
  for (const t of n === 2 ? [0.05, 0.72] : [0.5]) gat(S, [S.a[0] + (S.b[0] - S.a[0]) * t, S.a[1] + (S.b[1] - S.a[1]) * t, S.a[2]], 14, Math.abs(S.w[2]) > 0.5 ? 'w' : 'v');
  b.bout('Vloeranker', 'vloer', S.groep, [S.a[0], S.a[1], 0], Z, { key: 'anker', punten: (n === 2 ? [0.05, 0.72] : [0.5]).map((t) => [S.a[0] + (S.b[0] - S.a[0]) * t, S.a[1] + (S.b[1] - S.a[1]) * t, S.a[2]]), lengte: 110, uit: [0, 0, 200] });
}

export const REKKEN = [
  {
    id: 'FR-01', soort: 'rek', naam: 'Power rack', kort: 'Volledige kooi met J-hooks, safety\'s en optrekstang.',
    uitleg: 'Vier staanders met Westside-gaten (25 mm in de bankzone), J-hooks en safety\'s aan de binnenkant, optrekstang vooraan en schijfhouders achteraan. De zijkanten zijn gelast, de liggers gebout.',
    spieren: 'benen, rug, borst, schouders (vrije halterstang)', oefeningen: ['squat', 'bankdrukken', 'militaire press', 'rack pulls', 'optrekken'],
    maxLast: { thuis: 300, pro: 450 },
    markt: { thuis: [300, 1460], pro: [1400, 7150], bronT: 'Taurus Power Rack (Fitshop) € 299-399, Gorilla Power Squat Rack € 400, Rogue RML-390/490 € 1186-1456', bronP: 'Watson Power Rack ± € 1150-1390, Primal PXD ± € 7150, Hammer Strength HD Elite' },
    bouw(b) {
      const V = b.V, a = b.P('staander').b, H = pro(b) ? 2300 : 2200, wi = 1120, D = pro(b) ? 1220 : 1100, xs = wi / 2 + a / 2, yf = 200, yb = yf + D;
      const st = {};
      for (const [k, x] of [['L', -xs], ['R', xs]]) {
        b.groep(`Zijframe ${k}`);
        const voet = b.staaf('Voetbalk', 'voet', [x, 0, a / 2], [x, yb + 200, a / 2]);
        st[k] = { voet, f: staander(b, 'Staander voor', 'staander', x, yf, a, H, ws(b, a, H)), b: staander(b, 'Staander achter', 'staander', x, yb, a, H, ws(b, a, H)) };
        ligger(b, 'Bovenligger zijkant', 'ligger', st[k].f, st[k].b, { z: H - a / 2 });
        if (pro(b)) ankers(b, voet);
      }
      b.groep('frame');
      ligger(b, 'Optrekstang', 'optrek', st.L.f, st.R.f, { z: H - 70 }, { bout: true, groep: 'Optrekstang' });
      ligger(b, 'Bovenligger achter', 'ligger', st.L.b, st.R.b, { z: H - a / 2 - 55 }, { bout: true, groep: 'Bovenligger achter' });
      dwarsOp(b, 'Onderligger achter', 'ligger', st.L.voet, st.R.voet, yb + a + 10);
      const zj = gatZ(st.L.f, 1350), zs = gatZ(st.L.f, 800);
      const zb = jhook(b, st.L.f, zj, 'J-hook L', 1); jhook(b, st.R.f, zj, 'J-hook R', 1);
      safety(b, st.L.f, st.L.b, zs, 'Safety L'); safety(b, st.R.f, st.R.b, zs, 'Safety R');
      for (const [k, s] of [['L', -1], ['R', 1]]) for (const z of pro(b) ? [350, 700] : [400]) { b.groep(`Zijframe ${k}`); hoorn(b, st[k].b, [s * xs, yb, z], [s, 0, 0], 250); }
      b.groep('frame');
      const G = this.maxLast[V.id];
      b.stang([-1100, yf + a / 2 + 45, zb + 14], [1100, yf + a / 2 + 45, zb + 14]);
      b.schijven([-xs - a / 2 - 25 - 230, yf + a / 2 + 45, zb + 14], X, 2); b.schijven([xs + a / 2 + 25 + 140, yf + a / 2 + 45, zb + 14], X, 2);
      b.last('Gebruiker onder de stang', 100, [0, yf + 300, 1000], { geval: 'squat' }); b.last('Stang met de maximale last op de J-hooks', G, [0, yf + a / 2 + 45, zb + 14], { geval: 'squat' });
      b.reken('Safety: stang valt erop', b.o.delen.find((d) => d.naam.startsWith('Safety L')), 'ligger', D - a, 0, { g: G / 2, proef: 'vanghaak' });
      b.reken('Staander voor met de J-hook', st.L.f, 'staanderM', zj - a, 0, { g: G / 2, proef: 'vanghaak', e: a / 2 + 45 });
      b.reken('Optrekstang', b.o.delen.find((d) => d.naam === 'Optrekstang'), 'ligger', wi, V.gebruiker, { proef: 'intrinsiek' });
      b.pennen = null;
      b.o.pennen.forEach((p) => { p.F = G / 2; });
      b.o.bouten.filter((x) => x.naam === 'Optrekstang').forEach((x) => { x.F = V.gebruiker / 4; });
      b.o.verankerd = pro(b) ? 'vloer' : null;
    },
  },
  {
    id: 'FR-02', soort: 'rek', naam: 'Half rack', kort: 'Twee staanders met spotterarmen, achteraan schijfhouders.',
    uitleg: 'Twee hoge staanders met Westside-gaten, lange voetbalken naar achter met twee korte staanders vol schijfhouders. Spotterarmen vooraan als veiligheid.',
    spieren: 'benen, rug, borst, schouders', oefeningen: ['squat', 'bankdrukken', 'militaire press', 'optrekken'],
    maxLast: { thuis: 300, pro: 450 },
    markt: { thuis: [515, 965], pro: [1860, 6550], bronT: 'ATX Half Rack 750 € 514, Taurus Squat Rack Pro € 599, Rogue HR-2 € 965', bronP: 'Primal commercial half rack ± € 1860, Watson Animal Half Rack ± € 2000-2400, HS HD Elite Half Rack ± € 6550' },
    bouw(b) {
      const V = b.V, a = b.P('staander').b, H = pro(b) ? 2300 : 2200, wi = 1120, xs = wi / 2 + a / 2, yf = 500, yb = yf + 900, st = {};
      for (const [k, x] of [['L', -xs], ['R', xs]]) {
        b.groep(`Zijframe ${k}`);
        const voet = b.staaf('Voetbalk', 'voet', [x, 0, a / 2], [x, yb + 150, a / 2]);
        const f = staander(b, 'Staander', 'staander', x, yf, a, H, ws(b, a, H)), ba = staander(b, 'Achterstaander', 'staander', x, yb, a, 1100);
        ligger(b, 'Verbinding staander-achterstaander', 'ligger', f, ba, { z: 1100 - a / 2 });
        for (const z of pro(b) ? [400, 750] : [450]) hoorn(b, ba, [x, yb, z], [Math.sign(x), 0, 0], 250);
        st[k] = { voet, f, ba };
        if (pro(b)) ankers(b, voet);
      }
      b.groep('frame');
      ligger(b, 'Optrekstang', 'optrek', st.L.f, st.R.f, { z: H - 70 }, { bout: true, groep: 'Optrekstang' });
      ligger(b, 'Bovenligger', 'ligger', st.L.f, st.R.f, { z: H - 270 }, { bout: true, groep: 'Bovenligger' });
      dwarsOp(b, 'Onderligger achter', 'ligger', st.L.voet, st.R.voet, yb + a + 10);
      dwarsOp(b, 'Onderligger voor', 'ligger', st.L.voet, st.R.voet, 150);
      const zj = gatZ(st.L.f, 1350), zs = gatZ(st.L.f, 850), G = this.maxLast[V.id];
      const zb = jhook(b, st.L.f, zj, 'J-hook L', -1); jhook(b, st.R.f, zj, 'J-hook R', -1);
      for (const [k, S] of [['L', st.L.f], ['R', st.R.f]]) spotter(b, S, zs, `Spotterarm ${k}`, 600, this.maxLast[V.id] / 2);
      const [mn] = doos(st.L.f);
      b.stang([-1100, mn[1] - 50, zb + 14], [1100, mn[1] - 50, zb + 14]);
      b.last('Gebruiker voor het rek', 100, [0, yf - 350, 1000], { geval: 'squat' }); b.last('Stang op de J-hooks', G, [0, mn[1] - 50, zb + 14], { geval: 'squat' });
      b.reken('Spotterarm: stang valt op het uiteinde', b.o.delen.find((d) => d.naam === 'Spotterarm L'), 'uitkrager', 600, 0, { g: G / 2, proef: 'vanghaak', las: true });
      b.reken('Staander met de J-hook', st.L.f, 'staanderM', zj - a, 0, { g: G / 2, proef: 'vanghaak', e: a / 2 + 45 });
      b.o.pennen.forEach((p) => { p.F = G / 2; });
      b.o.verankerd = pro(b) ? 'vloer' : null;
    },
  },
  {
    id: 'FR-03', soort: 'rek', naam: 'Squat stands (paar)', kort: 'Twee losse staanders op een H-voet.',
    uitleg: 'Twee losse squatstaanders met Westside-gaten op een H-voet; elke staander heeft een J-hook en een schijfhouder achteraan. Verplaatsbaar, voor squat en bankdrukken.',
    spieren: 'benen, borst, rug', oefeningen: ['squat', 'bankdrukken', 'lunges'],
    maxLast: { thuis: 250, pro: 400 },
    markt: { thuis: [190, 650], pro: [800, 1500], bronT: 'Gorilla Squat/Bankdruk Rack € 190-200, Rogue SML-2C € 650', bronP: 'geen pro-prijs gevonden (Panatta op aanvraag): AANNAME € 800-1500' },
    bouw(b) {
      const V = b.V, a = b.P('staander').b, H = 1900, x0 = 600, Dv = pro(b) ? 900 : 800, yc = Dv / 2;
      for (const [k, x] of [['L', -x0], ['R', x0]]) {
        b.groep(`Staander ${k}`);
        const lang = b.staaf('Voetbalk', 'voet', [x, 0, a / 2], [x, Dv, a / 2]);
        for (const y of [a / 2, Dv - a / 2]) void y;
        const dw1 = b.staaf('Dwarsvoet voor', 'voet', [x - 260, -a, a / 2], [x + 260, -a, a / 2], { v: Y }), dw2 = b.staaf('Dwarsvoet achter', 'voet', [x - 260, Dv + a, a / 2], [x + 260, Dv + a, a / 2], { v: Y });
        void dw1; void dw2;
        // de voetbalk ligt tussen de dwarsvoeten: korter maken
        lang.a = [x, 0 - a / 2, a / 2]; lang.b = [x, Dv + a / 2, a / 2]; lang.L = Dv + a; lang.geo = [balk(lang.a, lang.b, X, a, a)];
        const S = staander(b, 'Staander', 'staander', x, yc, a, H, ws(b, a, H));
        hoorn(b, S, [x, yc, 500], [Math.sign(x), 0, 0], 230);
        voetjes(b, dw1, 2); voetjes(b, dw2, 2);
        const zj = gatZ(S, 1350), zb = jhook(b, S, zj, `J-hook ${k}`, -1);
        if (k === 'L') { b.last('Stang op de J-hooks (de helft per staander)', this.maxLast[V.id] / 2, [x, yc - a / 2 - 45, zb + 14], { geval: 'stang' }); b.reken('Staander met de J-hook', S, 'staanderM', zj - a, 0, { g: this.maxLast[V.id] / 2, proef: 'vanghaak', e: a / 2 + 45, las: true }); }
        if (k === 'L') b.stang([-1100, yc - a / 2 - 50, zb + 14], [1100, yc - a / 2 - 50, zb + 14]);
      }
      b.o.pennen.forEach((p) => { p.F = this.maxLast[V.id] / 2; });
      b.noot('Elke staander staat apart: zet ze op dezelfde gatenhoogte en de juiste breedte voor de stang (± 1200 mm hart op hart).');
    },
  },
  {
    id: 'FR-04', soort: 'rek', naam: 'Opklapbaar wandrek', kort: 'Rack tegen de muur dat je plat opklapt.',
    uitleg: 'Twee staanders met Westside-gaten en optrekstang, met scharnierende armen aan twee muurbeugels per kant. Na de training klap je het rek tegen de muur (diepte 200 mm). Altijd in de muur verankeren.',
    spieren: 'benen, borst, rug, schouders', oefeningen: ['squat', 'bankdrukken', 'militaire press', 'optrekken'],
    maxLast: { thuis: 250, pro: 400 },
    markt: { thuis: [475, 710], pro: [900, 1500], bronT: 'ATX Fold Back Rack 750 € 490-575, ATX FBR-500 € 475, Rogue R-3W € 600 / RML-3W € 710', bronP: 'Watson Wall Mounted Half Rack ± € 1040-1250 (niet opklapbaar): AANNAME € 900-1500' },
    bouw(b) {
      const V = b.V, a = b.P('staander').b, H = 2150, wi = 1120, xs = wi / 2 + a / 2, Dm = 560, t = V.plaat, st = {}, la = b.P('ligger');
      b.muur(Dm);
      for (const [k, x] of [['L', -xs], ['R', xs]]) {
        b.groep(`Staander ${k}`);
        const S = staander(b, 'Staander', 'staander', x, a / 2, 12, H, ws(b, 12, H));
        voetjes(b, S, 1);
        st[k] = S;
        for (const z of [300, H - 120]) {
          b.groep(`Staander ${k}`);
          const arm = b.staaf('Scharnierarm', 'ligger', [x, a, z], [x, Dm - t - 25, z]);
          b.groep(`Muurbeugel ${k} ${z < 1000 ? 'onder' : 'boven'}`);
          const wp = b.plaat('Muurplaat', [x - 60, Dm - t, z - 150], [x + 60, Dm, z + 150], { gaten: [[-35, -110], [35, -110], [-35, 110], [35, 110]].map(([p, q]) => ({ p: [x + p, Dm, z + q], d: 14 })) });
          for (const s of [-1, 1]) b.plaat('Scharnieroor', [x - la.b / 2 - 12, Dm - t - 110, z + s * (la.h / 2 + 1) + (s > 0 ? 0 : -t)], [x + la.b / 2 + 12, Dm - t, z + s * (la.h / 2 + 1) + (s > 0 ? t : 0)], { gaten: [{ p: [x, Dm - t - 70, z], d: V.pin + 1 }] });
          b.pen(`Scharnier ${k}`, [x, Dm - t - 70, z], Z, { d: V.pin, key: b.V.pin25, F: 0, snedes: 2, a: `Muurbeugel ${k}`, b: `Staander ${k}`, uit: [0, 0, 160], lengte: la.h + 2 * t + 40 });
          gat(arm, [x, Dm - t - 70, z], V.pin + 1, 'w');
          b.bout('Muuranker', 'muur', wp.groep, [x, Dm, z], Y, { key: 'anker', punten: wp.gaten.map((g) => g.p), lengte: 110, uit: [0, -200, 0] });
        }
      }
      b.groep('frame');
      ligger(b, 'Optrekstang', 'optrek', st.L, st.R, { z: H - 70 }, { bout: true, groep: 'Optrekstang' });
      const zj = gatZ(st.L, 1350), G = this.maxLast[V.id];
      const zb = jhook(b, st.L, zj, 'J-hook L', -1); jhook(b, st.R, zj, 'J-hook R', -1);
      for (const [k, S] of [['L', st.L], ['R', st.R]]) spotter(b, S, gatZ(S, 850), `Spotterarm ${k}`, 500, this.maxLast[V.id] / 2);
      b.stang([-1100, -50, zb + 14], [1100, -50, zb + 14]);
      b.reken('Spotterarm: stang valt op het uiteinde', b.o.delen.find((d) => d.naam === 'Spotterarm L'), 'uitkrager', 500, 0, { g: G / 2, proef: 'vanghaak', las: true });
      b.reken('Scharnierarm boven (trek naar de muur)', b.o.delen.find((d) => d.naam === 'Scharnierarm'), 'staander', Dm - a - t - 70, 0, { g: G / 2, proef: 'vanghaak' });
      b.o.pennen.forEach((p) => { p.F = G / 2; });
      b.o.verankerd = 'muur'; b.o.anker = { arm: Dm - 30, z: 900, n: 4, kg: this.maxLast[V.id] / 2 };
    },
  },
  {
    id: 'FR-05', soort: 'rek', naam: 'Squat rack met optrekstang', kort: 'Twee staanders op lange voeten, met optrekstang.',
    uitleg: 'Twee staanders op lange voetbalken voor- en achteraan, verbonden met een bovenligger en een optrekstang. J-hooks, spotterarmen en twee schijfhouders.',
    spieren: 'benen, borst, rug, schouders', oefeningen: ['squat', 'bankdrukken', 'optrekken', 'militaire press'],
    maxLast: { thuis: 300, pro: 450 },
    markt: { thuis: [375, 600], pro: [1500, 2500], bronT: 'ATX Wall-Mount Half Rack HRW-640 € 375, Bodycraft F460 € 499, Taurus Squat Rack Pro € 599', bronP: 'Taurus Elite Squat Rek € 1499, Primal commercial half rack ± € 1860' },
    bouw(b) {
      const V = b.V, a = b.P('staander').b, H = 2250, wi = 1120, xs = wi / 2 + a / 2, yc = 650, st = {};
      for (const [k, x] of [['L', -xs], ['R', xs]]) {
        b.groep(`Zijframe ${k}`);
        const voet = b.staaf('Voetbalk', 'voet', [x, 0, a / 2], [x, 1300, a / 2]);
        const S = staander(b, 'Staander', 'staander', x, yc, a, H, ws(b, a, H));
        hoorn(b, S, [x, yc, 450], [Math.sign(x), 0, 0], 250);
        st[k] = { voet, S };
        if (pro(b)) ankers(b, voet); else voetjes(b, voet, 2);
      }
      b.groep('frame');
      ligger(b, 'Optrekstang', 'optrek', st.L.S, st.R.S, { z: H - 70 }, { bout: true, groep: 'Optrekstang' });
      dwarsOp(b, 'Onderligger achter', 'ligger', st.L.voet, st.R.voet, 1300 - a / 2 - 10);
      const zj = gatZ(st.L.S, 1350), G = this.maxLast[V.id];
      const zb = jhook(b, st.L.S, zj, 'J-hook L', -1); jhook(b, st.R.S, zj, 'J-hook R', -1);
      for (const [k, S] of [['L', st.L.S], ['R', st.R.S]]) spotter(b, S, gatZ(S, 850), `Spotterarm ${k}`, 600, this.maxLast[V.id] / 2);
      const [mn] = doos(st.L.S);
      b.stang([-1100, mn[1] - 50, zb + 14], [1100, mn[1] - 50, zb + 14]);
      b.last('Gebruiker voor het rek', 100, [0, yc - 400, 1000], { geval: 'squat' }); b.last('Stang op de J-hooks', G, [0, mn[1] - 50, zb + 14], { geval: 'squat' });
      b.reken('Spotterarm: stang valt op het uiteinde', b.o.delen.find((d) => d.naam === 'Spotterarm L'), 'uitkrager', 600, 0, { g: G / 2, proef: 'vanghaak', las: true });
      b.reken('Staander met de J-hook', st.L.S, 'staanderM', zj - a, 0, { g: G / 2, proef: 'vanghaak', e: a / 2 + 45 });
      b.reken('Optrekstang', b.o.delen.find((d) => d.naam === 'Optrekstang'), 'ligger', wi, V.gebruiker, { proef: 'intrinsiek' });
      b.o.pennen.forEach((p) => { p.F = G / 2; });
      b.o.verankerd = pro(b) ? 'vloer' : null;
    },
  },
  {
    id: 'FR-06', soort: 'rek', naam: 'Optrekstang voor de muur', kort: 'Optrekstang op twee armen, 600 mm van de muur.',
    uitleg: 'Twee muurplaten met een arm en een schoor, en een optrekstang Ø32 vooraan. Uit één stuk gelast; met 4 keilbouten per plaat in beton of volle baksteen.',
    spieren: 'rug, biceps, buik', oefeningen: ['optrekken', 'chin-ups', 'hangend knieheffen'],
    maxLast: { thuis: 0, pro: 0 },
    markt: { thuis: [50, 250], pro: [250, 600], bronT: 'Taurus optrekstang € 49,90, Gorilla optrekstang wand 150 kg € 80, Fitwood Havu € 249', bronP: 'geen pro-prijs gevonden: AANNAME € 250-600' },
    bouw(b) {
      const V = b.V, a = b.P('licht').b, t = V.plaat, Dm = 620, zt = 2200, xs = 560;
      b.muur(Dm);
      const armen = [];
      for (const [k, x] of [['L', -xs], ['R', xs]]) {
        const wp = b.plaat('Muurplaat', [x - 70, Dm - t, zt - 380], [x + 70, Dm, zt + 40], { gaten: [[-46, 0], [46, 0], [-46, -340], [46, -340]].map(([p, q]) => ({ p: [x + p, Dm, zt + q - 10], d: 14 })) });
        const arm = b.staaf('Arm', 'licht', [x, Dm - t, zt - a / 2], [x, 30, zt - a / 2]);
        b.staaf('Schoor', 'licht', [x, Dm - t, zt - 330], [x, Dm - 420, zt - a], { verstek: [45, 45], opm: 'beide uiteinden schuin (45° + 27°): passen op de plaat en onder de arm' });
        armen.push(arm);
        b.bout('Muuranker', 'muur', wp.groep, [x, Dm, zt - 150], Y, { key: 'anker', punten: wp.gaten.map((g) => g.p), lengte: 110, uit: [0, -200, 0] });
        void k;
      }
      const st = ligger(b, 'Optrekstang', 'optrek', armen[0], armen[1], { y: 30 + 30, z: zt - a - 16 });
      st.a = [st.a[0] - 150, st.a[1], st.a[2]]; st.b = [st.b[0] + 150, st.b[1], st.b[2]]; st.L = len3(st.a, st.b); st.geo = [balk(st.a, st.b, Y, 32, 32, true)];
      b.reken('Arm (uitkragend) met de helft van de gebruiker', armen[0], 'uitkrager', Dm - 100, V.gebruiker / 2, { proef: 'intrinsiek', las: true });
      b.reken('Optrekstang', st, 'ligger', 2 * xs, V.gebruiker, { proef: 'intrinsiek' });
      b.o.verankerd = 'muur';
      b.o.anker = { arm: Dm - 30, z: 340, n: 2, kg: V.gebruiker / 2 };
    },
  },
  {
    id: 'FR-07', soort: 'rek', naam: 'Dipstation', kort: 'Vrijstaand dipstation met schoren.',
    uitleg: 'Twee dipstangen Ø42 op staanders met schoren, op een rechthoekige voet met rubbervoetjes. Breedte 560 mm hart op hart.',
    spieren: 'triceps, borst, schouders', oefeningen: ['dips', 'knieheffen', 'inverted rows (laag)'],
    maxLast: { thuis: 0, pro: 0 },
    markt: { thuis: [130, 450], pro: [1300, 2500], bronT: 'Taurus abs-/dipstation € 129, Gorilla Power Tower € 220, Gorilla opklapbaar € 450', bronP: 'Taurus Elite Power Tower € 1299 (deels AANNAME)' },
    bouw(b) {
      const V = b.V, a = b.P('licht').b, H = 1150, xs = 280, Dv = 1000;
      const zij = [];
      for (const [k, x] of [['L', -xs], ['R', xs]]) {
        b.groep('frame');
        const voet = b.staaf('Voetbalk', 'licht', [x, 0, a / 2], [x, Dv, a / 2]);
        const S = staander(b, 'Staander', 'licht', x, Dv / 2, a, H - 21 - b.P('bus').b / 2);
        b.staaf('Dipstang', 'bus', [x, Dv / 2 - 280, H - 21], [x, Dv / 2 + 280, H - 21], { opm: 'grip: kanten afronden' });
        for (const s of [-1, 1]) b.staaf('Schoor', 'licht', [x, Dv / 2 + s * 380, a], [x, Dv / 2 + s * (a / 2), 700], { verstek: [40, 50] });
        voetjes(b, voet, 2); zij.push(voet); void k;
      }
      ligger(b, 'Dwarsligger voor', 'licht', zij[0], zij[1], { y: a / 2 + 20, z: a / 2 });
      ligger(b, 'Dwarsligger achter', 'licht', zij[0], zij[1], { y: Dv - a / 2 - 20, z: a / 2 });
      b.last('Gebruiker op de dipstangen (aan het einde)', 100, [0, Dv / 2 + 280, H + 200], { geval: 'dips' });
      b.reken('Dipstang (uitkragend vanaf de staander)', b.o.delen.find((d) => d.naam === 'Dipstang'), 'uitkrager', 280, V.gebruiker / 2, { proef: 'intrinsiek' });
      b.reken('Staander', b.o.delen.find((d) => d.naam === 'Staander'), 'staanderM', H - a, V.gebruiker / 2, { proef: 'intrinsiek', e: 140, las: true });
    },
  },
  {
    id: 'FR-08', soort: 'rek', naam: 'Schijvenboom', kort: 'Paal met 6 schijfhouders op een H-voet.',
    uitleg: 'Een centrale paal met 6 schijfhouders Ø48,3 (voor schijven Ø50), 3 vooraan en 3 achteraan, op een H-voet met rubbervoetjes.',
    spieren: '-', oefeningen: ['opbergen van schijven'],
    maxLast: { thuis: 300, pro: 600 },
    markt: { thuis: [90, 300], pro: [450, 800], bronT: 'Taurus HS-100 € 89,90, Gorilla Olympia 50 mm € 170, ATX Plate Tree € 299', bronP: 'Primal Performance Weight Plate Tree ± € 465 (bovengrens AANNAME)' },
    bouw(b) {
      const V = b.V, P = b.P('staander'), a = P.b, Dv = pro(b) ? 800 : 700, xv = 260;
      const v1 = b.staaf('Voetbalk', 'licht', [-xv, -Dv / 2, 25], [-xv, Dv / 2, 25]), v2 = b.staaf('Voetbalk', 'licht', [xv, -Dv / 2, 25], [xv, Dv / 2, 25]);
      const lp = b.P('licht');
      v1.a[2] = v1.b[2] = lp.h / 2; v2.a[2] = v2.b[2] = lp.h / 2; v1.geo = [balk(v1.a, v1.b, X, lp.b, lp.h)]; v2.geo = [balk(v2.a, v2.b, X, lp.b, lp.h)];
      const mid = ligger(b, 'Middenbalk', 'staander', v1, v2, { y: 0, z: a / 2 });
      const S = staander(b, 'Paal', 'staander', 0, 0, a, 1150);
      for (const z of [300, 600, 900]) for (const s of [-1, 1]) hoorn(b, S, [0, 0, z], [0, s, 0], 230);
      voetjes(b, v1, 2); voetjes(b, v2, 2);
      const per = this.maxLast[V.id] / 6;
      b.schijven([0, -a / 2 - 15, 300], [0, -1, 0], 3, 450); b.schijven([0, a / 2 + 15, 600], [0, 1, 0], 2, 450);
      b.last('Schijven aan één kant (3 houders vol)', 3 * per, [0, -a / 2 - 110, 600], { geval: 'eenzijdig' });
      b.reken('Schijfhouder', b.o.delen.find((d) => d.naam === 'Schijfhouder'), 'uitkrager', 230, 0, { g: per, proef: 'opslagpen', las: true });
      b.reken('Paal (buiging bij eenzijdige last)', S, 'staanderM', 1150 - a, 0, { g: 3 * per, proef: 'opslagpen', e: a / 2 + 110 });
      void mid;
    },
  },
  {
    id: 'FR-09', soort: 'rek', naam: 'Schijvenrek op wielen', kort: 'Laag rek voor bumperschijven, 3 vakken, op 4 wielen.',
    uitleg: 'Een lage bak met drie vakken voor bumperschijven op hun kant. Vier zwenkwielen (twee met rem), een duwbeugel aan één kant.',
    spieren: '-', oefeningen: ['opbergen van schijven'],
    maxLast: { thuis: 200, pro: 350 },
    markt: { thuis: [150, 370], pro: [400, 900], bronT: 'ATX Bumper Plate Stacker € 187, ATX rollbare plate tree € 369, Gorilla opbergrek € 150', bronP: 'Primal Disc & Barbell Rack ± € 350 (zonder wielen): AANNAME € 400-900' },
    bouw(b) {
      const V = b.V, P = b.P('klein'), a = P.b, Bt = 960, Dt = 420, z0 = pro(b) ? 100 : 75, zr = z0 + a / 2;
      const r1 = b.staaf('Ligger voor', 'klein', [-Bt / 2, 0, zr], [Bt / 2, 0, zr]), r2 = b.staaf('Ligger achter', 'klein', [-Bt / 2, Dt, zr], [Bt / 2, Dt, zr]);
      const xs = [-Bt / 2 + a / 2, -Bt / 6, Bt / 6, Bt / 2 - a / 2];
      for (const x of xs) {
        const f = staander(b, 'Schot staander', 'klein', x, a / 2 + 0, z0 + a, z0 + 380);
        f.a = [x, 0, z0 + a]; f.b = [x, 0, z0 + 380]; f.geo = [balk(f.a, f.b, X, a, a)];
        const g = staander(b, 'Schot staander', 'klein', x, Dt, z0 + a, z0 + 380);
        ligger(b, 'Schot bovenligger', 'klein', f, g, { z: z0 + 380 - a / 2 });
        if (Math.abs(x) < Bt / 2 - a) continue;
        ligger(b, 'Dwarsligger', 'klein', r1, r2, { x, z: zr });
      }
      // duwbeugel
      b.staaf('Duwbeugel', 'greep', [Bt / 2 + 16, 0, z0 + 380 + 16 + 200], [Bt / 2 + 16, Dt, z0 + 380 + 16 + 200], { opm: 'gebogen beugel: hier als rechte stang op twee steunen' });
      for (const y of [0, Dt]) b.staaf('Steun duwbeugel', 'greep', [Bt / 2 + 16, y, z0 + 380], [Bt / 2 + 16, y, z0 + 380 + 200], { opm: 'tegen het schot gelast' });
      const wl = [];
      for (const x of [-Bt / 2 + 60, Bt / 2 - 60]) for (const y of [0, Dt]) wl.push(balk([x, y, 0], [x, y, z0], X, 50, 50, true, 'rubber'));
      b.koop(V.wiel, 4, wl, { naam: `${V.wiel === 'zwenkwiel50' ? 'Zwenkwiel 50 mm' : 'Zwenkwiel 75 mm met rem'} onder de liggers` });
      b.schijven([-Bt / 3 - 30, Dt / 2, z0 + a + 225], [1, 0, 0], 1, 450, 60); b.schijven([-30, Dt / 2, z0 + a + 225], [1, 0, 0], 1, 450, 60);
      b.reken('Ligger voor (schijven in 1 vak, 2 steunpunten)', r1, 'ligger', Bt / 3, 0, { g: this.maxLast[V.id] / 3, proef: 'opslagpen' });
      b.last('Volle bak', this.maxLast[V.id], [0, Dt / 2, z0 + 260], { geval: 'vol' });
    },
  },
  {
    id: 'FR-10', soort: 'rek', naam: 'Dumbbellrek 2 lagen', kort: 'Rek voor 10 paar halters op twee schuine lagen.',
    uitleg: 'Twee zijframes met een voetbalk en twee staanders, twee legplanken van twee liggers met UHMW (gebout). Voor 10 paar dumbbells tot 30 kg (thuis) of 50 kg (pro).',
    spieren: '-', oefeningen: ['opbergen van halters'],
    maxLast: { thuis: 400, pro: 800 },
    markt: { thuis: [200, 380], pro: [400, 1000], bronT: 'Taurus KHS 20 € 199, ATX dumbbellrek 2 lagen € 289-379, Taurus 3-laags € 299', bronP: 'Primal 10-pair / 3-tier ± € 385-640, Taurus Elite halterstandaard € 999' },
    bouw(b) {
      const V = b.V, a = b.P('licht').b, k = b.P('klein').b, Bt = pro(b) ? 1600 : 1300, xs = Bt / 2 - 40;
      const arms = { onder: [], boven: [] };
      for (const [nm, x] of [['L', -xs], ['R', xs]]) {
        b.groep(`Zijframe ${nm}`);
        const voet = b.staaf('Voetbalk', 'licht', [x, 0, a / 2], [x, 650, a / 2]);
        const s1 = staander(b, 'Staander voor', 'licht', x, 170, a, 500), s2 = staander(b, 'Staander achter', 'licht', x, 470, a, 800);
        arms.onder.push(b.staaf('Draagarm onder', 'licht', [x, 40, 500 + a / 2], [x, 300, 500 + a / 2]));
        arms.boven.push(b.staaf('Draagarm boven', 'licht', [x, 340, 800 + a / 2], [x, 600, 800 + a / 2]));
        voetjes(b, voet, 2); void s1; void s2;
      }
      for (const [laag, y0, y1, z] of [['onder', 70, 270, 500 + a], ['boven', 370, 570, 800 + a]]) {
        b.groep(`Legplank ${laag}`);
        const r = [y0, y1].map((y) => b.staaf(`Legplankligger ${laag}`, 'klein', [-xs - a / 2 - 20, y, z + k / 2], [xs + a / 2 + 20, y, z + k / 2]));
        b.koop('uhmw', 1, r.map((d) => balk([d.a[0], d.a[1], z + k + 5], [d.b[0], d.b[1], z + k + 5], X, k, 10, false, 'uhmw')), { naam: `UHMW-strip ${k} x ${Bt + 2 * a} x 10 op de legplank`, oppervlak: (2 * k * (Bt + 2 * a)) / 1e6 });
        for (const [i, A] of arms[laag].entries()) b.bout(`Legplank ${laag} ${i ? 'R' : 'L'}`, A.groep, `Legplank ${laag}`, [A.a[0], (y0 + y1) / 2, z], Z, { punten: [y0, y1].map((y) => [A.a[0], y, z]), lengte: a + k + 30, uit: [0, 0, 160], key: 'boutM12' });
        for (const A of arms[laag]) for (const y of [y0, y1]) gat(A, [A.a[0], y, z], 13, 'w');
        for (const R of r) for (const A of arms[laag]) gat(R, [A.a[0], R.a[1], z], 13, 'w');
      }
      b.groep('frame');
      b.last('Halters op de bovenste laag', this.maxLast[V.id] / 2, [0, 470, 800 + a + 120], { geval: 'boven vol' });
      b.last('Halters op de onderste laag', this.maxLast[V.id] / 2, [0, 170, 500 + a + 120], { geval: 'boven vol' });
      b.reken('Legplankligger (halters verdeeld)', b.o.delen.find((d) => d.naam.startsWith('Legplankligger')), 'ligger', Bt, 0, { g: this.maxLast[V.id] / 4, proef: 'opslagpen', verdeeld: true });
      b.reken('Draagarm (uitkragend)', arms.onder[0], 'uitkrager', 130, 0, { g: this.maxLast[V.id] / 8, proef: 'opslagpen', las: true });
    },
  },
  {
    id: 'FR-11', soort: 'rek', naam: 'Stangenhouder verticaal', kort: 'Bodemplaat met 6 kokers en een bovenrek voor 6 stangen.',
    uitleg: 'Zes stangen rechtop: de uiteinden in kokers Ø60 op een bodemplaat, bovenaan tussen twee staanders een ligger met zes uitsparingen.',
    spieren: '-', oefeningen: ['opbergen van halterstangen'],
    maxLast: { thuis: 120, pro: 150 },
    markt: { thuis: [70, 150], pro: [250, 500], bronT: 'Primal Upright Barbell Storage ± € 80, Taurus Profierek € 99,90', bronP: 'geen pro-prijs gevonden: AANNAME € 250-500' },
    bouw(b) {
      const V = b.V, k = b.P('klein').b, t = V.plaat, Bt = 720, Dt = 440;
      b.plaat('Bodemplaat', [-Bt / 2, 0, 12], [Bt / 2, Dt, 12 + t], { gaten: [] });
      const xs = [-250, -150, -50, 50, 150, 250];
      for (const x of xs) b.staaf('Stangkoker', 'b60x3', [x, 200, 12 + t], [x, 200, 12 + t + 110], { kap: false, opm: 'stang staat erin op zijn huls' });
      const s1 = staander(b, 'Staander', 'klein', -Bt / 2 + k / 2, Dt - k / 2, 12 + t, 1250), s2 = staander(b, 'Staander', 'klein', Bt / 2 - k / 2, Dt - k / 2, 12 + t, 1250);
      const lig = ligger(b, 'Bovenligger met uitsparingen', 'klein', s1, s2, { z: 1250 - k / 2 });
      b.plaat('Kam (6 uitsparingen 40 mm)', [-Bt / 2 + k, Dt - k - 250, 1250 - 6], [Bt / 2 - k, Dt - k, 1250], { vorm: 'kam', opm: '6 U-uitsparingen 40 breed, 90 diep, hart op hart 100 (laser)' });
      const vt = [];
      for (const x of [-Bt / 2 + 40, Bt / 2 - 40]) for (const y of [40, Dt - 40]) vt.push(balk([x, y, 0], [x, y, 12], X, 50, 50, true, 'rubber'));
      b.koop(V.voetje, 4, vt, { naam: 'Voetje onder de bodemplaat' });
      for (const x of xs) b.stang([x, 200, 12 + t + 30], [x, 200, 12 + t + 30 + 2100]);
      b.last('6 stangen rechtop', 6 * 20, [0, 200, 1000], { geval: 'vol' });
      b.reken('Stangkoker (een stang van 20 kg leunt er zijwaarts tegen, 10 %)', b.o.delen.find((d) => d.naam === 'Stangkoker'), 'uitkrager', 110, 0, { g: 20, proef: 'opslagpen', las: true });
      b.reken('Bovenligger met de kam (6 stangen leunen ertegen, 10 % van 120 kg)', lig, 'ligger', Bt - 2 * k, 0, { g: 12, proef: 'opslagpen' });
      void lig;
    },
  },
  {
    id: 'FR-12', soort: 'rek', naam: 'Stangenrek voor de muur', kort: 'Twee muurstrips met 4 haken voor 4 stangen.',
    uitleg: 'Twee verticale muurstrips met elk vier haken (koker met een opstaande lip). Vier stangen liggen horizontaal. Met 3 keilbouten of pluggen per strip.',
    spieren: '-', oefeningen: ['opbergen van halterstangen'],
    maxLast: { thuis: 100, pro: 120 },
    markt: { thuis: [70, 140], pro: [150, 350], bronT: 'Rogue 3 Bar Gun Rack € 71 / V2 € 76, Gorilla wand-stangenrek € 120', bronP: 'geen pro-prijs gevonden: AANNAME € 150-350' },
    bouw(b) {
      const V = b.V, k = b.P('klein'), t = V.plaat, Dm = 200;
      b.muur(Dm);
      for (const x of [-500, 500]) {
        b.groep(`Muurstrip ${x < 0 ? 'L' : 'R'}`);
        const wp = b.plaat('Muurstrip', [x - 40, Dm - t, 900], [x + 40, Dm, 1800], { gaten: [930, 1270, 1700].map((z) => ({ p: [x, Dm, z], d: 14 })) });
        for (const z of [1000, 1180, 1360, 1540]) {
          b.staaf('Haak', 'klein', [x, Dm - t, z], [x, Dm - t - 150, z]);
          b.plaat('Lip', [x - k.b / 2, Dm - t - 150 - 6, z + k.h / 2], [x + k.b / 2, Dm - t - 150, z + k.h / 2 + 30], { opm: 'lip 30 mm, randen r 2,5' });
        }
        b.bout('Muuranker', 'muur', wp.groep, [x, Dm, 1350], Y, { key: 'anker', punten: wp.gaten.map((g) => g.p), lengte: 110, uit: [0, -200, 0] });
      }
      b.groep('frame');
      for (const z of [1000, 1180, 1360, 1540]) b.stang([-1100, Dm - t - 90, z + k.h / 2 + 14], [1100, Dm - t - 90, z + k.h / 2 + 14]);
      b.reken('Haak (uitkragend) met een stang + schijven', b.o.delen.find((d) => d.naam === 'Haak'), 'uitkrager', 150, 0, { g: 25, proef: 'opslagpen', las: true });
      b.o.verankerd = 'muur'; b.o.anker = { arm: 120, z: 400, n: 1, kg: 4 * 25 / 2 };
    },
  },
  {
    id: 'FR-13', soort: 'rek', naam: 'Kettlebellrek', kort: 'Rek met twee legborden voor ± 12 kettlebells.',
    uitleg: 'Vier staanders, twee legborden van een kader met een plaat van 3 mm en een rubbermat. Voor kettlebells tot 32 kg (thuis) of 48 kg (pro).',
    spieren: '-', oefeningen: ['opbergen van kettlebells'],
    maxLast: { thuis: 300, pro: 500 },
    markt: { thuis: [220, 370], pro: [400, 800], bronT: 'Gorilla Kettlebell Standaard € 220, Taurus Kettlebell Rek € 299, 2 legplanken € 369', bronP: 'geen pro-prijs gevonden: AANNAME € 400-800' },
    bouw(b) {
      const V = b.V, k = b.P('klein').b, Bt = pro(b) ? 1400 : 1200, Dt = 450, Hs = 850;
      const S = [];
      for (const x of [-Bt / 2 + k / 2, Bt / 2 - k / 2]) for (const y of [k / 2, Dt - k / 2]) S.push(staander(b, 'Staander', 'klein', x, y, 12, Hs));
      for (const z of [250, Hs - k / 2]) {
        const v = ligger(b, 'Bordligger voor', 'klein', S[0], S[2], { z }), a2 = ligger(b, 'Bordligger achter', 'klein', S[1], S[3], { z });
        ligger(b, 'Bordligger zijkant', 'klein', S[0], S[1], { z }); ligger(b, 'Bordligger zijkant', 'klein', S[2], S[3], { z });
        b.plaat('Legbord', [-Bt / 2 + k, k, z + k / 2], [Bt / 2 - k, Dt - k, z + k / 2 + 3], { opm: 'plaat 3 mm, rondom gehecht (stiknaad 4 x 30)' });
        b.koop('rubbermat', 1, [balk([-Bt / 2 + k, Dt / 2, z + k / 2 + 4.5], [Bt / 2 - k, Dt / 2, z + k / 2 + 4.5], Y, Dt - 2 * k, 3, false, 'rubber')], { naam: 'Rubbermat 3 mm op het legbord', oppervlak: ((Bt - 2 * k) * (Dt - 2 * k)) / 1e6 });
        if (z === 250) b.reken('Bordligger (verdeelde last)', v, 'ligger', Bt - 2 * k, 0, { g: this.maxLast[V.id] / 4, proef: 'opslagpen', verdeeld: true });
        void a2;
      }
      const vt = S.map((s) => balk([s.a[0], s.a[1], 0], [s.a[0], s.a[1], 12], X, 40, 40, true, 'rubber'));
      b.koop(V.voetje, 4, vt, { naam: 'Voetje onder de staanders' });
      b.last('Bovenste bord vol', this.maxLast[V.id] / 2, [0, Dt / 2, Hs + 150], { geval: 'vol' });
    },
  },
  {
    id: 'FR-14', soort: 'rek', naam: 'Landmine-station', kort: 'Grondplaat met een draaiende en kantelende huls.',
    uitleg: 'Een huls voor het uiteinde van een olympische stang, die 360° draait en op en neer kantelt rond een pen. Op een grondplaat van 600 x 600 met rubber (thuis) of 4 ankers (pro).',
    spieren: 'romp, schouders, benen, rug', oefeningen: ['landmine press', 'landmine row', 'rotaties', 'squat to press'],
    maxLast: { thuis: 100, pro: 160 },
    markt: { thuis: [50, 150], pro: [150, 400], bronT: 'Gorilla T-Bar Row Landmine € 50-91, Taurus Landmine Core Trainer € 149', bronP: 'geen pro-prijs gevonden: AANNAME € 150-400' },
    bouw(b) {
      const V = b.V, t = V.plaat, gp = 600, zs = 12 + t;
      b.groep('Grondplaat');
      b.plaat('Grondplaat', [-gp / 2, -gp / 2, 12], [gp / 2, gp / 2, zs], { gaten: pro(b) ? [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([p, q]) => ({ p: [p * 250, q * 250, 12], d: 14 })) : [] });
      const as = b.staaf('Draaias', 'b60x3', [0, 0, zs], [0, 0, zs + 140], { kap: false });
      for (const s of [-1, 1]) b.plaat('Schoorschot draaias', [s > 0 ? 30.15 : -80.15, -4, zs], [s > 0 ? 80.15 : -30.15, 4, zs + 25], { vorm: 'driehoek', opm: 'driehoekig schot 50 x 25, tegen de draaias' });
      b.plaat('Draagring draaias', [-45, -45, zs + 25], [45, 45, zs + 30], { rond: true, in: 'draaias', opm: 'ring Ø90 x 5 rond de draaias: de draaibus rust erop' });
      b.groep('Draaistuk');
      const bus = b.staaf('Draaibus', 'b76x4', [0, 0, zs + 31], [0, 0, zs + 140], { in: as.id, kap: false, opm: 'schuift over de draaias; glijbus of vet' });
      b.plaat('Jukplaat', [-55, -45, zs + 140], [-45, 45, zs + 240], { gaten: [{ p: [-50, 0, zs + 195], d: V.pin + 1 }] });
      b.plaat('Jukplaat', [45, -45, zs + 140], [55, 45, zs + 240], { gaten: [{ p: [50, 0, zs + 195], d: V.pin + 1 }] });
      b.plaat('Bovenplaat draaistuk', [-45, -40, zs + 140], [45, 40, zs + 148], {});
      b.groep('Huls');
      const ang = (35 * Math.PI) / 180, p0 = [0, 0, zs + 195];
      b.staaf('Kantelbus', 'bus', [-44, 0, zs + 195], [44, 0, zs + 195], { kap: false });
      const e = [0, -Math.cos(ang) * 340, zs + 195 + Math.sin(ang) * 340];
      b.staaf('Huls (voor stang Ø50)', 'b60x3', [0, -Math.cos(ang) * 20, zs + 195 + Math.sin(ang) * 20], e, { opm: 'binnen Ø53: de stanghuls Ø50 past erin', in: 'x' });
      b.pen('Kantelpen', p0, X, { d: V.pin, key: b.V.pin25, F: 0, snedes: 2, a: 'Draaistuk', b: 'Huls', uit: [0, -150, 120], lengte: 140 });
      if (pro(b)) b.bout('Vloeranker', 'vloer', 'Grondplaat', [0, 0, 12], Z, { key: 'anker', punten: [[-250, -250, 12], [250, -250, 12], [250, 250, 12], [-250, 250, 12]], lengte: 110, uit: [0, 0, 200] });
      else b.koop('rubbermat', 1, [balk([-gp / 2, 0, 6], [gp / 2, 0, 6], Y, gp, 12, false, 'rubber')], { naam: 'Rubbermat 12 mm onder de grondplaat (AANNAME: zelfde prijs per m²)', oppervlak: 0.36 });
      b.stang(e, [0, -Math.cos(ang) * 2100, zs + 195 + Math.sin(ang) * 2100]);
      b.reken('Huls (uitkragend vanaf de pen)', b.o.delen.find((d) => d.naam.startsWith('Huls')), 'uitkrager', 340, 0, { g: this.maxLast[V.id] / 2, proef: 'extrinsiek', las: true });
      b.o.pennen.forEach((p) => { p.F = this.maxLast[V.id] / 2; });
      void bus;
    },
  },
];

/** spotterarm: U-beugel om de staander (rugplaat, twee wangen en een haaklip achter de staander bovenaan), twee pennen
 *  door beide wanden, koker naar voren met UHMW. Het moment van de arm wordt een koppel tussen de haaklip (boven,
 *  achtervlak) en de onderrand van de rugplaat (voorvlak); de pennen dragen de verticale last. Monteren: schuin
 *  aanzetten, eerst de lip achter de staander, dan de arm zakken en de pennen steken. G = last per arm (kg). */
function spotter(b, S, zGat, naam, L, G = 0) {
  const oud = b.huidig, t = b.V.plaat, a = S.P.b, [mn, mx] = doos(S), x = S.a[0], P = b.P('breed'), pin = b.V.pin, xi = a / 2 + 1, xo = xi + t, z2 = zGat - 150, ztop = zGat + 100, zbot = zGat - 300, tl = 15, hl = 80;
  b.groep(naam);
  b.plaat('Rugplaat spotterarm', [x - xo, mn[1] - t, zbot], [x + xo, mn[1], ztop], { gaten: [{ p: [x, mn[1], zGat], d: pin + 1 }, { p: [x, mn[1], z2], d: pin + 1 }], opm: 'U-beugel: rugplaat' });
  for (const s of [-1, 1]) b.plaat('Wang spotterarm', [x + s * xi, mn[1], zbot], [x + s * xo, mx[1] + tl, ztop], { opm: 'wang langs het zijvlak (1 mm speling, UHMW-tape)' });
  b.plaat('Haaklip spotterarm', [x - xi, mx[1] + 1, ztop - hl], [x + xi, mx[1] + 1 + tl, ztop], { opm: `lip ${tl} mm achter de staander bovenaan: neemt het moment op` });
  b.staaf(naam, 'breed', [x, mn[1] - t, zGat - 40 - P.h / 2], [x, mn[1] - t - L, zGat - 40 - P.h / 2], { v: X });
  for (const z of [zGat, z2]) b.staaf('Pen spotterarm', `r${pin}`, [x, mn[1] - t, z], [x, mx[1] + 12, z], { in: S.id, kap: false, opm: 'door beide wanden, gelast in de rugplaat' });
  b.koop('uhmw', 1, [balk([x, mn[1] - t, zGat - 40 + 5], [x, mn[1] - t - L, zGat - 40 + 5], X, P.b - 4, 10, false, 'uhmw')], { naam: `UHMW-strip ${P.b - 4} x ${L} x 10 op de spotterarm`, oppervlak: ((P.b - 4) * L) / 1e6 });
  b.groep(oud);
  const pl = t + a + 12;
  for (const [z, k] of [[zGat, 'boven'], [z2, 'onder']]) b.pen(`${naam} pen ${k}`, [x, mn[1] - t + pl / 2, z], Y, { d: pin, lengte: pl, snedes: 2, t: S.P.t, factor: 'vanghaak', a: S.groep, b: naam, uit: [0, -180, 0], gelast: 'Pen spotterarm' });
  if (G) {
    const k = b.V.klasse === 'H' ? 4 : 6, F = k * G * 9.81, M = F * L, h = ztop - hl / 2 - zbot, Fl = M / h, Ml = Fl * (2 * xi) / 8, Wl = hl * tl ** 2 / 6, sl = Ml / Wl;
    b.toets('Evenwicht', `Spotterarm: koppel op de staander (${naam})`, `proeflast ${k} · ${G} kg · g = ${(F / 1000).toFixed(2)} kN op ${L} mm: M = ${(M / 1e6).toFixed(2)} kNm; koppel haaklip - onderrand rugplaat over ${h} mm: F = M/h = ${(Fl / 1000).toFixed(1)} kN; haaklip ${tl} x ${hl} over ${Math.round(2 * xi)} mm: σ = F·b/8 / (h·t²/6) = ${sl.toFixed(0)} N/mm² ≤ 235`, sl / 235, 'evenwicht (statica); EN 1993-1-1 §6.2.5');
  }
}
const len3 = (p, q) => Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
export { spotter };
