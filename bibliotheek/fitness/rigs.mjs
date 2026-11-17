// Multigyms en rigs (FM-..): rigs met één tot vier vakken tussen staanders met Westside-gaten (vrijstaand of tegen de
// muur), met optrekstangen, J-hooks en safety\'s in het eerste vak, monkey bars, ophangpunten voor ringen, schijvenopslag
// en dipstations; en multigyms als functional trainers met één, twee of drie torens. Pro-vormtaal zoals de rekken
// (kopplaten, eindplaten, zijplaat met naam). Node en browser.
import { staander, ligger, dwarsOp, jhook, safety, hoorn, gatZ, X, Y, Z, balk } from './bouwstenen.mjs';
import { westsideGaten, ankers } from './rekken.mjs';
import { ftBouw } from './kabel.mjs';
import { mt } from './bouwstenen.mjs';

const pro = (b) => b.V.id !== 'thuis';
const MATEN = ['compact', 'standaard', 'XL'];

/**
 * rig: c = { vakken, wi (breedte van een vak), D (diepte), muur (tegen de muur: ondiep, muurplaten), extra: [...] }
 * extra: 'monkey' (sporten bovenaan), 'ringen' (ophangbalk met 2 ringen), 'opslag' (schijfhouders aan de achterste
 * staanders), 'dip' (dipgrepen aan een staander), 'jhooks' (J-hooks en safety\'s in het eerste vak)
 */
export function rigBouw(b, def, c) {
  const V = b.V, a = b.P('staander').b, H = mt(b, c.H ?? (pro(b) ? 2400 : 2300), [-250, 150]), n = c.vakken, wi = c.wi ?? 1120, D = c.D ?? (pro(b) ? 1220 : 1100);
  const yf = 200, yb = yf + D, xs = (i) => (i - n / 2) * (wi + a), extra = new Set(c.extra ?? []), G = def.maxLast?.[V.id] ?? 300;
  const st = [], tf = 10, zf = tf, Pl = b.P('licht');
  // P3-03 v8: elke staander op een voetflens 180 x 180 x 10 (Fable: 150; 180 houdt de ankergaten buiten de las) met 2 vloerankers (zoals de merken), geen doorlopende voetbalk;
  // de zijframes onderaan met een onderligger. P3-04 v8: een muurrig heeft geen achterstaanders: een muurstrip (koker 60 x 60)
  // met een console bovenaan en onderaan.
  const flens = (S, x, y) => {
    const g = [[-62, -62], [62, 62]].map(([dx, dy]) => [x + dx, y + dy, 0]);
    b.plaat('Voetflens', [x - 90, y - 90, 0], [x + 90, y + 90, tf], { gaten: g.map((p) => ({ p, d: 14 })), opm: 'voetflens 180 x 180 x 10 gelaserd, R10, 2 gaten Ø14 diagonaal voor keilbouten M12; de staander rondom erop gelast' });
    b.bout('Vloeranker', 'vloer', S.groep, [x, y, 0], Z, { key: 'anker', punten: g.map((p) => [p[0], p[1], tf]), lengte: 120 });
  };
  for (let i = 0; i <= n; i++) {
    const x = xs(i);
    b.groep(`Zijframe ${i + 1}`);
    const f = staander(b, 'Staander voor', 'staander', x, yf, zf, H, westsideGaten(b, zf, H));
    flens(f, x, yf);
    let bk;
    if (c.muur) {
      bk = staander(b, 'Muurstrip', 'licht', x, yb, 400, H, { opm: 'koker 60 x 60 tegen de muur (muurplaten met keilbouten): draagt de consoles; geen achterstaander tot op de vloer (P3-04)' });
      ligger(b, 'Muurconsole onder', 'licht', f, bk, { z: 500 });
    } else {
      bk = staander(b, 'Staander achter', 'staander', x, yb, zf, H, westsideGaten(b, zf, H));
      flens(bk, x, yb);
      ligger(b, 'Onderligger zijkant', 'ligger', f, bk, { z: 160 });
    }
    const zl = ligger(b, 'Bovenligger zijkant', c.muur ? 'licht' : 'ligger', f, bk, { z: H - (c.muur ? Pl.h : a) / 2 });
    st.push({ x, voet: null, f, b: bk, zl });
  }
  // P3-03 v8: schetsplaat 8 mm met een rond gat op de buitenkant van de buitenste zijframes, in de hoek staander-onderligger
  if (!c.muur) for (const [i, sx] of [[0, -1], [n, 1]]) {
    const S = st[i], xp = S.x + sx * (a / 2 + 4), z0 = 160 - a / 2;
    b.groep(`Zijframe ${i + 1}`);
    for (const [y0, sy] of [[yf, 1]]) { // alleen vooraan: achteraan zit de geboute onderligger
      const yi = y0 + sy * (a / 2), pts = [[y0 - sy * (a / 2), z0], [yi + sy * 200, z0], [yi + sy * 200, z0 + a, 30], [yi, z0 + a + 200, 30], [y0 - sy * (a / 2), z0 + a + 200]];
      b.contour('Schetsplaat hoek', [xp, 0, 0], [0, 1, 0], [0, 0, 1], 8, sy > 0 ? pts : pts.reverse(), { banden: 8, gaten: [{ x: yi + sy * 62, y: z0 + a + 62, d: 30 }], opm: 'schetsplaat 8 mm op de buitenkant, afgeronde punt en een rond gat Ø30 (zoals de merken)' });
    }
  }
  // P3-03 v8: gatnummers om de 5 gaten gelaserd op de voorkant van de voorste staanders (zie het stukblad)
  b.o.pronk = b.o.pronk ?? [];
  for (const S of st) { const gs = (S.f.gaten ?? []).filter((g) => g.westside !== false).map((g) => g.s).sort((p, q) => p - q); gs.forEach((s2, k) => { if (k % 5 === 4) b.o.pronk.push(balk([S.x - a / 2 + 4, yf - a / 2 - 0.4, zf + s2 - 6], [S.x - a / 2 + 4, yf - a / 2 - 0.4, zf + s2 + 6], X, 8, 0.8, false, 'instructie')); }); }
  b.koop('gatnummers', st.length, [], { naam: 'Gatnummers om de 5 gaten gelaserd op de voorste staanders (lasermarkering, AANNAME)', groep: 'afwerking' });
  // liggers per vak: vooraan een optrekstang (of een gewone ligger), achteraan een bovenligger; onderaan dwars op de voeten
  for (let i = 0; i < n; i++) {
    const L = st[i], R = st[i + 1];
    b.groep('frame');
    ligger(b, 'Optrekstang', 'optrek', L.f, R.f, { z: H - 70 }, { bout: true, groep: `Optrekstang ${i + 1}` });
    ligger(b, 'Bovenligger achter', 'ligger', L.b, R.b, { z: H - a / 2 - 55 }, { bout: true, groep: `Bovenligger achter ${i + 1}` });
    if (!c.muur) ligger(b, 'Onderligger achter', 'ligger', L.b, R.b, { z: 160 }, { bout: true, groep: `Onderligger achter ${i + 1}` });
  }
  if (c.muur) { b.o.muur = yb + Pl.b / 2 + 10; for (const s of st) b.plaat('Muurplaat', [s.x - 60, yb + Pl.b / 2, 400], [s.x + 60, yb + Pl.b / 2 + 10, 700], { gaten: [[-35, 450], [35, 450], [-35, 650], [35, 650]].map(([dx, z]) => ({ p: [s.x + dx, yb + a / 2, z], d: 14 })), opm: 'muurplaat 10 mm, 4 x M12 keilbout in beton' }); b.o.verankerd = 'muur'; b.o.anker = { arm: 300, z: 550, n: 4 * st.length, kg: G / 2 };
    // de muur als context (lichtgrijs, hoort niet bij het toestel) en de koppen van de keilbouten in de muurplaten
    const x0 = st[0].x - 400, x1 = st[n].x + 400, zm = (H + 300) / 2;
    b.o.context.push(balk([x0, b.o.muur + 60, zm], [x1, b.o.muur + 60, zm], Z, H + 300, 120, false, 'muur'));
    b.o.pronk = b.o.pronk ?? [];
    for (const s of st) for (const [dx, z] of [[-35, 450], [35, 450], [-35, 650], [35, 650]]) b.o.pronk.push(balk([s.x + dx, yb + Pl.b / 2 - 9, z], [s.x + dx, yb + Pl.b / 2 - 1, z], X, 19, 19, false, 'zink', { zes: true }), balk([s.x + dx, yb + a / 2 - 1, z], [s.x + dx, yb + a / 2, z], X, 26, 26, true, 'ring'));
    b.koop('keilbout', 4 * st.length, [], { naam: 'Keilbout M12 x 120 verzinkt in beton (muurplaten)', groep: 'afwerking' }); }
  else b.o.verankerd = 'vloer';
  // P2-05 v6: zwaaien/kippen aan de optrekstang (0,5 x gebruiker horizontaal, AANNAME): alleen verankerd
  b.trekLast('Kippen aan de optrekstang (0,5 x gebruiker)', 0.5 * V.gebruiker * 9.81, [xs(0) + wi / 2, yf, H - 70], [0, -1, 0]);
  b.o.notities.push('Kipping, muscle-ups en ringen alleen met de 4 vloerankers per zijframe (typeplaatje).');
  // J-hooks en safety\'s in het eerste vak
  if (extra.has('jhooks')) {
    const zj = gatZ(st[0].f, 1350), zs = gatZ(st[0].f, 800);
    jhook(b, st[0].f, zj, 'J-hook L', 1); jhook(b, st[1].f, zj, 'J-hook R', 1);
    if (!c.muur) { safety(b, st[0].f, st[0].b, zs, 'Safety L'); safety(b, st[1].f, st[1].b, zs, 'Safety R'); }
    b.o.pennen.forEach((p) => { p.F = G / 2; });
  }
  // monkey bars: sporten Ø35 tussen de bovenliggers voor en achter, om de 300 mm, in elk vak
  if (extra.has('monkey')) {
    b.groep('Monkey bars');
    // P2-06 v6: eigen ladder per vak: 2 liggers (koker, met kopplaten tussen de staanders gebout) en sporten ertussen
    const zm = H - 300, Pl = b.P('licht');
    for (let i = 0; i < n; i++) if (i % 2 === 1 && !(i === n - 1 && extra.has('ringen'))) {
      const L = st[i], Rr = st[i + 1];
      ligger(b, 'Ladderligger voor', 'licht', L.f, Rr.f, { z: zm }, { bout: true, groep: `Monkey bars ${i + 1}` });
      ligger(b, 'Ladderligger achter', 'licht', L.b, Rr.b, { z: zm }, { bout: true, groep: `Monkey bars ${i + 1}` });
      b.groep(`Monkey bars ${i + 1}`);
      for (let x = xs(i) + a / 2 + 150; x < xs(i + 1) - a / 2 - 100; x += 300) b.staaf('Sport monkey bar', 'optrek', [x, yf + Pl.b / 2, zm], [x, yb - Pl.b / 2, zm], { opm: 'door de ladderliggers gestoken en gelast; kartel', kap: false });
      b.groep('Monkey bars');
    }
    { const sp = b.o.delen.find((d) => d.naam === 'Sport monkey bar'); if (sp) b.reken('Sport monkey bar (gebruiker hangt eraan)', sp, 'ligger', D - Pl.b, V.gebruiker, { proef: 'intrinsiek' }); const ll = b.o.delen.find((d) => d.naam === 'Ladderligger voor'); if (ll) b.reken('Ladderligger (2 gebruikers)', ll, 'ligger', wi, V.gebruiker, { proef: 'intrinsiek' }); }
    b.groep('frame');
  }
  // ophangbalk met 2 ringen (gymnastiekringen aan straps) in het laatste vak
  if (extra.has('ringen')) {
    const L = st[n - 1], R = st[n];
    b.groep(`Zijframe ${n + 1}`);
    // P2-07 v6: ophangbalk aan beide kanten gebout (kopplaten 2 x M16), berekend op 2 gebruikers die schommelen
    const ob = ligger(b, 'Ophangbalk', 'ligger', L.zl, R.zl, { y: (yf + yb) / 2, z: H - a / 2 }, { bout: true, groep: 'Ophangbalk', as: 0 });
    b.groep('frame');
    b.reken('Ophangbalk (2 gebruikers aan de ringen, schommelen)', ob, 'ligger', wi, 2 * V.gebruiker, { proef: 'intrinsiek' });
    b.koop('ringen', 1, [-1, 1].map((sx) => balk([(L.x + R.x) / 2 + sx * 250, (yf + yb) / 2, H - a], [(L.x + R.x) / 2 + sx * 250, (yf + yb) / 2, 1500], X, 6, 6, true, 'kabel')), { naam: 'Gymnastiekringen hout Ø28 met straps aan de ophangbalk' });
  }
  // schijvenopslag: 2 houders per achterste staander, naar achteren
  if (extra.has('opslag') && !c.muur) for (const s of [st[0], st[n]]) for (const z of [350, 700]) { b.groep(`Zijframe ${st.indexOf(s) + 1}`); hoorn(b, s.b, [s.x, yb, z], [0, 1, 0], 250); }
  // dipgrepen aan de voorste staander van het laatste vak (vast, naar voren)
  if (extra.has('dip')) {
    const s = st[n];
    b.groep('Dipstation');
    // P1-05 v6: U-zadel om de staander (rugplaat 10 mm vooraan + 2 wangen langs de zijvlakken), 2 pennen Ø25 op 150 mm door
    // de Westside-gaten (door beide wanden), dipbeugel op de rugplaat gelast, grepen Ø42,4 x 4 licht naar buiten
    const Pl = b.P('licht'), t = 10, z1 = gatZ(s.f, 950), z2 = gatZ(s.f, 1100), zd = z2 + 60, xi = a / 2 + 1, xo = xi + 8, yp = yf - a / 2, Lg = 400, pin = V.pin, Mk = 2.5 * V.gebruiker * (Lg + 10 + b.P('licht').b) / (z2 - z1) / 2.5;
    b.plaat('Dip rugplaat', [s.x - xo, yp - t, z1 - 60], [s.x + xo, yp, zd + 60], { gaten: [z1, z2].map((z) => ({ p: [s.x, yp, z], d: pin + 1 })), opm: `rugplaat ${t} mm, gaten Ø${pin + 1} op ${Math.round(z2 - z1)} mm voor de pennen` });
    for (const sx of [-1, 1]) b.plaat('Dip wang', [s.x + sx * xi, yp, z1 - 60], [s.x + sx * xo, yp + a, zd + 60], { opm: 'wang 8 mm langs het zijvlak (U-zadel, 1 mm speling): de beugel draait niet rond de pennen' });
    const yd = yp - t - Pl.b / 2;
    b.staaf('Dipbeugel', 'licht', [s.x - 290, yd, zd], [s.x + 290, yd, zd], { v: Y, kap: true, opm: 'op de rugplaat gelast' });
    for (const z of [z1, z2]) {
      b.staaf('Dip pen', `r${pin}`, [s.x, yp - t, z], [s.x, yp + a + 12, z], { in: s.f.id, kap: false, opm: 'rond S355J2, door beide wanden van de staander, borgveer achteraan' });
      b.pen(`Dip pen ${z === z1 ? 'onder' : 'boven'}`, [s.x, yp + (a + 12 - t) / 2, z], [0, 1, 0], { d: pin, lengte: a + 12 + t, F: Mk, snedes: 2, t: s.f.P.t, fy: 355, factor: 'intrinsiekPen', a: `Zijframe ${n + 1}`, b: 'Dipstation', uit: [0, -140, 0], gelast: 'Dip pen' });
    }
    const grepen = [-1, 1].map((sx) => b.staaf('Dipgreep', 'b42x4', [s.x + sx * 260, yd - Pl.b / 2 + 0.3, zd], [s.x + sx * 300, yd - Pl.b / 2 - Lg, zd], { opm: 'buis Ø42,4 x 4, gekarteld of rubber handvat; licht naar buiten (40 mm op 400)' }));
    b.groep('frame');
    // berekening: de gebruiker steunt met het halve gewicht op elke greep, hand op het einde (P1-05)
    b.reken('Dipgreep (gebruiker in de dip, hand op het einde)', grepen[0], 'uitkrager', Lg, V.gebruiker / 2, { proef: 'intrinsiek', las: true });
    {
      const F = 2.5 * V.gebruiker * 9.81, M = F * (Lg + t + Pl.b) / 1000, Fp = M / ((z2 - z1) / 1000), Fb = 2 * 1.5 * s.f.P.t * pin * 235;
      b.toets('Pennen en bouten', 'Dipbeugel: pennen in de staander (koppel)', `proeflast 2,5 · ${V.gebruiker} kg · g = ${(F / 1000).toFixed(2)} kN op ${Lg + t + Pl.b} mm: M = ${(M / 1000).toFixed(2)} kNm; 2 pennen Ø${pin} op ${Math.round(z2 - z1)} mm: ${(Fp / 1000).toFixed(1)} kN per pen ≤ stuik 2 wanden 2·1,5·t·d·fy = ${(Fb / 1000).toFixed(1)} kN`, Fp / Fb, 'EN 1993-1-8 tabel 3.4 (stuik, vereenvoudigd)');
    }
    b.last('Gebruiker in de dip', V.gebruiker, [s.x, yd - Pl.b / 2 - Lg / 2, zd], { geval: 'dip' });
  }
  b.groep('frame');
  b.stang([xs(0) - 450, yf + a / 2 + 45, gatZ(st[0].f, 1350) + 14], [xs(1) + 450, yf + a / 2 + 45, gatZ(st[0].f, 1350) + 14]);
  b.last('Gebruiker aan de optrekstang', 120, [xs(0) + wi / 2, yf, H - 100], { geval: 'optrekken' }); b.last('Stang op de J-hooks', G, [xs(0) + wi / 2, yf + 45, 1350], { geval: 'squat' });
  b.reken('Optrekstang', b.o.delen.find((d) => d.naam === 'Optrekstang'), 'ligger', wi, V.gebruiker, { proef: 'intrinsiek' });
  b.reken('Staander voor (stang op de J-hook)', st[0].f, 'staanderM', 1350 - a, 0, { g: G / 2, proef: 'vanghaak', e: a / 2 + 45 });
  void Z;
}

const MR = (t, p, bt, bp) => ({ thuis: t, pro: p, bronT: bt, bronP: bp });
const R = (id, naam, kort, uitleg, oef, maxLast, markt, cfg) => ({ id, soort: 'multigym', naam, kort, uitleg, spieren: 'hele lichaam (vrije gewichten, eigen gewicht)', oefeningen: oef, maxLast, markt, maten: MATEN, cfg, bouw(b) { rigBouw(b, this, this.cfg); } });
const F = (id, naam, kort, uitleg, xs, markt) => ({ id, soort: 'multigym', naam, kort, uitleg, spieren: 'alles (kabel)', oefeningen: ['cable fly', 'row', 'pulldown', 'woodchopper', 'curls', 'pushdown'], markt, maten: MATEN, xs, bouw(b) { ftBouw(b, this.xs, this.id); } });
const MRIG = (n, muur) => MR([600 + 350 * n, 1100 + 600 * n], [1500 + 900 * n, 3000 + 1600 * n], `Gorilla / ATX rigs ± € ${600 + 350 * n}-${1100 + 600 * n}${muur ? ' (muurmodel)' : ''}`, `Rogue Monster / Eleiko rigs ± € ${1500 + 900 * n}-${3000 + 1600 * n}`);
const ML = { thuis: 300, pro: 450 };
export const RIGS = [
  R('FM-01', 'Rig 1 vak', 'Vrijstaand rig met 1 vak, J-hooks en safety\'s.', 'Vier staanders met Westside-gaten, een optrekstang vooraan, J-hooks en safety\'s, schijvenopslag achteraan.', ['squat', 'bankdrukken', 'optrekken'], ML, MRIG(1), { vakken: 1, extra: ['jhooks', 'opslag'] }),
  R('FM-02', 'Rig 2 vakken', 'Vrijstaand rig met 2 vakken.', 'Zes staanders, twee optrekstangen, J-hooks en safety\'s in het eerste vak, schijvenopslag.', ['squat', 'optrekken', 'kipping'], ML, MRIG(2), { vakken: 2, extra: ['jhooks', 'opslag'] }),
  R('FM-03', 'Rig 3 vakken', 'Vrijstaand rig met 3 vakken.', 'Acht staanders, optrekstangen in elk vak, J-hooks en safety\'s in het eerste vak.', ['squat', 'optrekken', 'kipping'], ML, MRIG(3), { vakken: 3, extra: ['jhooks', 'opslag'] }),
  R('FM-04', 'Rig 4 vakken', 'Vrijstaand rig met 4 vakken.', 'Tien staanders en vier optrekstangen; J-hooks en safety\'s in het eerste vak.', ['squat', 'optrekken', 'kipping'], ML, MRIG(4), { vakken: 4, extra: ['jhooks', 'opslag'] }),
  R('FM-05', 'Muurrig 2 vakken', 'Ondiep rig tegen de muur, 2 vakken.', 'Staanders voor en achter op 600 mm, achteraan met muurplaten op de muur; optrekstangen en J-hooks.', ['optrekken', 'squat'], ML, MRIG(2, true), { vakken: 2, D: 600, muur: true, extra: ['jhooks'] }),
  R('FM-06', 'Muurrig 3 vakken', 'Ondiep rig tegen de muur, 3 vakken.', 'Zoals het muurrig met 2 vakken, met 3 vakken.', ['optrekken', 'squat'], ML, MRIG(3, true), { vakken: 3, D: 600, muur: true, extra: ['jhooks'] }),
  R('FM-07', 'Rig met monkey bars', 'Rig met 3 vakken en sporten bovenaan.', 'Zoals het rig met 3 vakken; in het middelste vak sporten Ø35 om de 300 mm tussen voor en achter (monkey bars).', ['monkey bars', 'optrekken', 'squat'], ML, MRIG(3), { vakken: 3, extra: ['jhooks', 'monkey', 'opslag'] }),
  R('FM-08', 'Rig met ringen', 'Rig met 2 vakken en een ophangbalk met ringen.', 'Zoals het rig met 2 vakken, met een ophangbalk midden in het laatste vak en twee gymnastiekringen.', ['ring rows', 'dips aan ringen', 'muscle-ups'], ML, MRIG(2), { vakken: 2, extra: ['jhooks', 'ringen'] }),
  R('FM-09', 'Rig met dipstation', 'Rig met 2 vakken en vaste dipgrepen.', 'Zoals het rig met 2 vakken, met een dipbeugel vooraan de laatste staander.', ['dips', 'optrekken', 'squat'], ML, MRIG(2), { vakken: 2, extra: ['jhooks', 'dip', 'opslag'] }),
  R('FM-10', 'Muurrig met ringen', 'Ondiep muurrig met ophangbalk en ringen.', 'Muurrig met 2 vakken op 600 mm diepte, een ophangbalk en twee ringen.', ['ring rows', 'optrekken'], ML, MRIG(2, true), { vakken: 2, D: 600, muur: true, extra: ['ringen'] }),
  R('FM-11', 'Rig 2 vakken compleet', 'Rig met J-hooks, ringen, dipstation en opslag.', 'Rig met 2 vakken en alles erop: J-hooks en safety\'s, ophangbalk met ringen, dipgrepen en schijvenopslag.', ['squat', 'dips', 'ring rows', 'optrekken'], ML, MRIG(2), { vakken: 2, extra: ['jhooks', 'ringen', 'dip', 'opslag'] }),
  R('FM-12', 'Rig 4 vakken met monkey bars', 'Groot rig voor een box: 4 vakken, monkey bars, ringen.', 'Tien staanders; sporten in de vakken 2 en 4, ringen in het laatste vak, J-hooks en safety\'s in het eerste.', ['monkey bars', 'optrekken', 'ring work', 'squat'], ML, MRIG(4), { vakken: 4, extra: ['jhooks', 'monkey', 'ringen', 'opslag'] }),
  F('FM-13', 'Functional trainer compact', 'Twee torens dicht bij elkaar met verstelbare wagens.', 'Functional trainer met twee omkapte stapels en verstelbare wagens, smaller dan FK-04.', [-640, 640], MR([1400, 2600], [3600, 6800], 'Gorilla / ATX functional trainer ± € 1400-2600', 'Life Fitness / Matrix dual adjustable pulley ± € 3600-6800')),
  F('FM-14', 'Functional trainer breed', 'Twee torens ver uit elkaar met verstelbare wagens.', 'Functional trainer met twee omkapte stapels, breder dan FK-04: meer ruimte voor fly en woodchopper.', [-850, 850], MR([1600, 2900], [3900, 7400], 'ATX / Tunturi functional trainer ± € 1600-2900', 'Technogym / Life Fitness ± € 3900-7400')),
  R('FM-15', 'Muurrig 1 vak', 'Ondiep rig tegen de muur met 1 vak en J-hooks.', 'Twee staanders voor en twee tegen de muur op 600 mm, optrekstang en J-hooks; muurplaten met keilbouten.', ['squat', 'optrekken'], ML, MRIG(1, true), { vakken: 1, D: 600, muur: true, extra: ['jhooks'] }),
  R('FM-16', 'Muurrig 4 vakken', 'Ondiep rig tegen de muur met 4 vakken.', 'Tien staanders op 600 mm diepte, vier optrekstangen, J-hooks in het eerste vak.', ['optrekken', 'squat', 'kipping'], ML, MRIG(4, true), { vakken: 4, D: 600, muur: true, extra: ['jhooks'] }),
  R('FM-17', 'Rig 3 vakken met ringen en dips', 'Rig met 3 vakken, ringen en dipgrepen.', 'Rig met 3 vakken: J-hooks en safety\'s in het eerste vak, ringen in het laatste, dipgrepen vooraan.', ['squat', 'ring rows', 'dips', 'optrekken'], ML, MRIG(3), { vakken: 3, extra: ['jhooks', 'ringen', 'dip'] }),
  R('FM-18', 'Rig 2 vakken diep', 'Rig met 2 vakken op 1,5 m diepte (ruimte binnenin).', 'Zoals het rig met 2 vakken, maar 1,5 m diep: je traint binnen het rig met J-hooks en safety\'s.', ['squat', 'bankdrukken', 'optrekken'], ML, MRIG(2), { vakken: 2, D: 1500, extra: ['jhooks', 'opslag'] }),
  R('FM-19', 'Rig 2 vakken hoog', 'Hoog rig (2,5 m) voor muscle-ups en ringen.', 'Zoals het rig met 2 vakken, maar 2,5 m hoog (optrekstang op 2,43 m); ringen in het laatste vak.', ['muscle-ups', 'optrekken', 'ring work'], ML, MRIG(2), { vakken: 2, H: 2500, extra: ['jhooks', 'ringen'] }),
  R('FM-20', 'Muurrig 3 vakken met ringen', 'Ondiep muurrig met 3 vakken en ringen.', 'Muurrig op 600 mm met 3 vakken, J-hooks en een ophangbalk met ringen.', ['ring rows', 'optrekken', 'squat'], ML, MRIG(3, true), { vakken: 3, D: 600, muur: true, extra: ['jhooks', 'ringen'] }),
  R('FM-21', 'Rig 1 vak met dipstation', 'Vrijstaand rig met 1 vak, J-hooks en dipgrepen.', 'Vier staanders, optrekstang, J-hooks en safety\'s, dipgrepen vooraan.', ['squat', 'dips', 'optrekken'], ML, MRIG(1), { vakken: 1, extra: ['jhooks', 'dip'] }),
  R('FM-22', 'Rig 3 vakken monkey bars en dips', 'Rig met 3 vakken, sporten in het midden en dipgrepen.', 'Zoals het rig met monkey bars, met dipgrepen vooraan de laatste staander.', ['monkey bars', 'dips', 'optrekken'], ML, MRIG(3), { vakken: 3, extra: ['jhooks', 'monkey', 'dip'] }),
  F('FM-23', 'Functional trainer met 3 torens', 'Drie omkapte stapels in een rij met verstelbare wagens.', 'Groot kabelstation voor een studio: drie torens met elk een stapel en een wagen, twee verbindingen bovenaan.', [-1300, 0, 1300], MR([2400, 4200], [5600, 9800], 'combinatie van 3 kabeltorens ± € 2400-4200', 'Life Fitness / Matrix multi-station ± € 5600-9800')),
  F('FM-24', 'Functional trainer extra breed', 'Twee torens op 2 m met een optrekstang ertussen.', 'Functional trainer met twee omkapte stapels op 2 m afstand: ruimte voor twee sporters of een bank ertussen.', [-1000, 1000], MR([1700, 3000], [4200, 7800], 'ATX / Tunturi functional trainer ± € 1700-3000', 'Technogym / Life Fitness ± € 4200-7800')),
  R('FM-25', 'Rig 1 vak diep met opslag', 'Vrijstaand rig met 1 vak, 1,5 m diep, met schijvenopslag.', 'Vier staanders op 1,5 m diepte, J-hooks en safety\'s, schijvenopslag achteraan.', ['squat', 'bankdrukken', 'optrekken'], ML, MRIG(1), { vakken: 1, D: 1500, extra: ['jhooks', 'opslag'] }),
];