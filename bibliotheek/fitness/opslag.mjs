// Opslag en accessoires (FO-..), in de vormtaal van Rogue/Eleiko: rekken met eindframes in koker (gelaserde zijplaat
// met logo, ronde voeten), lagen die 15° naar de gebruiker hellen met een V-goot in gezette plaat en rubberen inleg per
// laag (halters, ballen) of een gezette bak met opstaande randen (kettlebells, spullen); palen en wandstrips met houders
// (Ø42 met eindkap en rubberen huls) op een gelaserde basisplaat met ronde hoeken; parallettes, laadstang, plyobox als
// dichte doos in gezette plaat met handgrepen, schijvenkar. Node en browser.
import { staander, voetjes, X, Y, Z, balk, doos } from './bouwstenen.mjs';
import { mt } from './bouwstenen.mjs';
import { add, mul, norm, cross } from './model.mjs';
import { uitslagStrook, ontvouw } from './vorm.mjs';

const pro = (b) => b.V.id !== 'thuis';
const MATEN = ['compact', 'standaard', 'XL'];
const RAD = Math.PI / 180;
const logoAan = (b) => b.o.opties?.afwerking?.logo ?? true;

/** ronde voet: gelaste eindplaat 6 mm met een halfronde bovenkant op beide uiteinden van een voetbalk */
function rondeVoet(b, d) {
  const t = 6, hx = d.P.b / 2 + 3, z0 = -d.P.h / 2, z1 = d.P.h / 2 + 3;
  for (const [e, r] of [[d.a, mul(d.u, -1)], [d.b, d.u]]) {
    b.contour('Eindplaat voet', add(e, mul(r, t / 2)), norm(cross([0, 0, 1], r)), [0, 0, 1], t, [[-hx, z0, 0], [hx, z0, 0], [hx, z1, hx - 0.5], [-hx, z1, hx - 0.5]], { banden: 6, opm: `eindplaat ${t} mm met halfronde bovenkant (R${Math.round(hx)}), sluit de voet; rondom gelast en de rand gebroken` });
  }
}

/** houder Ø42,4 aan staander S (van punt p in richting dir), met een rubberen huls en een eindkap (Ø50-schijven passen) */
export function houder(b, S, p, dir, L = 250, naam = 'Schijfhouder') {
  const [mn, mx] = doos(S), d = norm(dir), ax = [0, 1, 2].reduce((m, i) => (Math.abs(d[i]) > Math.abs(d[m]) ? i : m), 0);
  const q = [...p]; q[ax] = d[ax] > 0 ? mx[ax] : mn[ax];
  const h = b.staaf(naam, 'b42x3', q, add(q, mul(d, L)), { opm: 'buis Ø42,4 x 3,2 met rubberen huls (Ø48) en eindkap: schijven Ø50 schuiven er vrij over' });
  b.koop('rubberhuls', 1, [balk(add(q, mul(d, 22)), add(q, mul(d, L - 8)), h.v, 48, 48, true, 'rubber')], { naam: `Rubberen huls op ${naam.toLowerCase()}`, meter: Math.round(L - 30) / 1000 });
  // P3-08 v6: gedraaide eindkap Ø56 met kraag in de accentkleur: de schijven blijven hangen
  b.o.pronk = b.o.pronk ?? []; b.o.pronk.push(balk(add(q, mul(d, L)), add(q, mul(d, L + 6)), h.v, 56, 56, true, 'accent'), balk(add(q, mul(d, L + 6)), add(q, mul(d, L + 14)), h.v, 44, 44, true, 'accent'));
  b.koop('eindkapAccent', 1, [], { naam: `Gedraaide eindkap Ø56 met kraag (accentkleur) op ${naam.toLowerCase()}`, groep: 'afwerking' });
  return h;
}

/** rek met lagen: c = { L, lagen: [{ z, d (diepte), helling (mm hoger achteraan, standaard 15° bij halters), soort: 'halter'|'bal'|'plank', zit }], kg (per laag) } */
export function rekLagen(b, def, c) {
  // eindframe: paal voor en paal achter op een voet met ronde eindplaten, een kopligger bovenop en aan de buitenkant
  // een gelaserde zijplaat met logo. Per laag een arm tussen de palen (schuin bij een helling). Halters en ballen: een
  // gootligger over alle frames met een V-goot in gezette plaat en rubberen inleg; plank: twee liggers met een gezette bak.
  const L = mt(b, c.L ?? 1500, [-300, 400]), P = b.P('licht'), a = P.b, Dm = Math.max(...c.lagen.map((l) => l.d));
  const y1 = a / 2 + 20, y2 = Dm + a + 20, yv = y1 + a, D = y2 + a / 2 + 20, tg = pro(b) ? 3 : 2;
  const goot = (l) => l.soort === 'halter' || l.soort === 'bal';
  const lagen = c.lagen.map((l) => ({ ...l, hel: l.helling ?? (l.soort === 'halter' ? Math.round(Math.tan(15 * RAD) * (l.d - yv)) : 0), w: l.soort === 'bal' ? 300 : Math.min(240, l.d - yv - 40), hV: l.soort === 'bal' ? 100 : 70 }));
  const H = Math.max(...lagen.map((l) => l.z + l.hel + (goot(l) ? l.hV + 20 : 0))) + 60;
  const xs = L > (lagen.some(goot) && (c.kg ?? 200) >= 200 ? 1400 : 1700) ? [-L / 2, 0, L / 2] : [-L / 2, L / 2], x0 = xs[0] - a / 2, x1 = xs[xs.length - 1] + a / 2;
  // logo onderaan in de zijplaat, tussen de voet en de laagste laagarm (als daar plaats is)
  const zLaag = Math.min(...lagen.map((l) => l.z)) - 1.5 * a, zl = (a + zLaag) / 2, logo = logoAan(b) && zLaag - a >= 90, yc0 = (y1 + y2) / 2;
  const frames = xs.map((x, i) => {
    b.groep(`Eindframe ${i + 1}`);
    const voet = b.staaf('Voet', 'licht', [x, 0, a / 2], [x, D, a / 2]); voetjes(b, voet, 2); rondeVoet(b, voet);
    const pv = staander(b, 'Paal voor', 'licht', x, y1, a, H), pa = staander(b, 'Paal achter', 'licht', x, y2, a, H);
    b.staaf('Kopligger', 'licht', [x, y1 - a / 2, H + a / 2], [x, y2 + a / 2, H + a / 2]);
    if (i === 0 || i === xs.length - 1) {
      const sx = i === 0 ? -1 : 1, tz = pro(b) ? 4 : 3;
      const zp = b.contour('Zijplaat', [x + sx * (a / 2 + tz / 2), 0, 0], [0, 1, 0], [0, 0, 1], tz, [[y1 - a / 2, a, 0], [y2 + a / 2, a, 0], [y2 + a / 2, H + a, 40], [y1 + a / 2 + 40, H + a, 30], [y1 - a / 2, a + Math.round((H - a) * 0.55), 60]], {
        uitsparingen: logo ? [[[yc0 - 80, zl - 20, 19.5], [yc0 + 80, zl - 20, 19.5], [yc0 + 80, zl + 20, 19.5], [yc0 - 80, zl + 20, 19.5]]] : [],
        banden: 8, opm: `gelaserde zijplaat ${tz} mm met ronde hoeken R40${logo ? ' en het logo als uitsparing (placeholder)' : ''}, met 6 blindklinkmoeren M8 op de palen geschroefd (stoppen de goten af)` });
      zp.geenLas = true; b.koop('boutM8', 6, [], { naam: 'Bout M8 x 16 + blindklinkmoer M8 (zijplaat op de palen)' });
      if (logo) b.plaat('Logo-achterplaat', [x + sx * (a / 2 - 2), yc0 - 95, zl - 35], [x + sx * (a / 2), yc0 + 95, zl + 35], { kleur: 'logo', opm: 'gelaserd 2 mm in de accentkleur achter de logo-uitsparing, met VHB op de zijplaat' }).geenLas = true;
    }
    return { x, voet, pv, pa };
  });
  b.groep('frame');
  const rubber = [];
  for (const [k, l] of lagen.entries()) {
    const yA = l.d, sl = l.hel / Math.max(1, yA - yv), z = (y) => l.z + sl * (y - yv);
    for (const fr of frames) { b.groep(`Eindframe ${frames.indexOf(fr) + 1}`); b.staaf(`Laagarm ${k + 1}`, 'licht', [fr.x, y1 + a / 2, z(y1 + a / 2) - a], [fr.x, y2 - a / 2, z(y2 - a / 2) - a], { opm: 'tussen de palen gelast' }); }
    b.groep('frame');
    if (goot(l)) {
      // gootligger op de laagarmen, de V-goot erop: twee flanken van één gezette plaat (zetlijn onderin)
      const th = Math.atan(sl), e1 = [0, Math.cos(th), Math.sin(th)], n = [0, -Math.sin(th), Math.cos(th)], yc = (yv + yA) / 2;
      const ag = b.P('ligger').h, S = add([0, yc, z(yc) - a], mul(n, a / 2 + ag / 2));
      b.staaf(`Gootligger laag ${k + 1}`, 'ligger', [x0, S[1], S[2]], [x1, S[1], S[2]], { v: e1, kap: false, opm: 'over alle eindframes, op de laagarmen gelast; de V-goot erop gelast langs de zetlijn' });
      const F = add(S, mul(n, ag / 2)), Lf = Math.hypot(l.w / 2, l.hV), al = Math.atan2(l.hV, l.w / 2);
      const flanken = [];
      for (const s of [-1, 1]) {
        const f = norm(add(mul(e1, s * l.w / 2), mul(n, l.hV))), mIn = norm(add(mul(n, l.w / 2), mul(e1, -s * l.hV)));
        const o3 = add(F, mul(n, 0.3 - 2 * Math.sin(al) + (tg / 2) * Math.cos(al)));
        flanken.push(b.contour(`V-goot laag ${k + 1}`, o3, [1, 0, 0], f, tg, [[x0, 2], [x1, 2], [x1, Lf], [x0, Lf]], { banden: 1, opm: `flank van de V-goot: één gezette plaat ${tg} mm, ${Math.round(2 * Lf)} mm ontwikkeld, flanken ${Math.round(al / RAD)}° en de goot ${Math.round(th / RAD)}° naar voren; rubberen inleg 3 mm` }));
        const m = add(add(o3, mul(f, (Lf + 2) / 2)), mul(mIn, tg / 2 + 1.5));
        rubber.push({ g: balk([x0 + 6, m[1], m[2]], [x1 - 6, m[1], m[2]], f, Lf - 14, 3, false, 'rubber'), opp: ((x1 - x0 - 12) * (Lf - 14)) / 1e6 });
      }
      // één gezette plaat: uitslag met één zetting (afwijking 2·α van vlak) in het midden (P1-11)
      b.gezet(`V-goot laag ${k + 1}`, flanken, { t: tg, uitslag: uitslagStrook(x1 - x0, [Lf - 2, Lf - 2], [{ hoek: Math.round((2 * al) / RAD), R: 2 * tg, richting: 'op' }], tg), opm: `V-goot uit één plaat ${tg} mm: 1 zetting ${Math.round((2 * al) / RAD)}° Ri ${2 * tg} (K = 0,4, AANNAME zetterij); rubberen inleg 3 mm` });
    } else {
      for (let q = 0; q < xs.length - 1; q++) {
        const xa = xs[q] + a / 2, xb = xs[q + 1] - a / 2;
        for (const y of [yv, yA]) b.staaf(`Ligger laag ${k + 1}`, 'licht', [xa, y, z(y)], [xb, y, z(y)], { opm: 'op de laagarmen gelast' });
        const zt = Math.max(z(yv), z(yA)) + a / 2, tb = 3, ya = yv - a / 2, yb = yA + a / 2, rand = l.zit ? 0 : 40;
        const bod = b.plaat(rand ? `Bak laag ${k + 1}` : `Zitplaat laag ${k + 1}`, [xa, ya, zt], [xb, yb, zt + tb], { opm: rand ? `bodem van de gezette bak` : `zitplaat ${tb} mm, randen gebroken; het zitkussen erop geschroefd` });
        bod.geenLas = true; // met 4 bouten M8 op de liggers (P2-25 v6: geen lange lasnaad, de bak is uitneembaar)
        b.koop('boutM8', 4, [], { naam: `Bout M8 x 20 met ring: bak laag ${k + 1} op de liggers` });
        if (rand) {
          const randen = [[ya, ya + tb], [yb - tb, yb]].map(([y0, y9]) => { const r2 = b.plaat(`Bak laag ${k + 1}`, [xa, y0, zt + tb], [xb, y9, zt + tb + rand], { opm: 'opstaande rand van de gezette bak' }); r2.geenLas = true; return r2; });
          b.gezet(`Bak laag ${k + 1}`, [bod, ...randen], { t: tb, uitslag: uitslagStrook(xb - xa, [rand, yb - ya - 2 * tb, rand], [{ hoek: 90, R: 2 * tb, richting: 'op' }, { hoek: 90, R: 2 * tb, richting: 'op' }], tb), opm: `gezette bak uit één plaat ${tb} mm: bodem met 2 opstaande randen van ${rand} mm, 2 zettingen 90° Ri ${2 * tb} (K = 0,4); rubbermat 3 mm` });
        }
        if (rand) rubber.push({ g: balk([xa + 4, (ya + yb) / 2, zt + tb + 1.5], [xb - 4, (ya + yb) / 2, zt + tb + 1.5], Y, yb - ya - 2 * tb - 4, 3, false, 'rubber'), opp: ((xb - xa) * (yb - ya)) / 1e6 });
        if (l.zit) b.kussen('Zitkussen', [xa + 30, (ya + yb) / 2, zt + tb], [xb - 30, (ya + yb) / 2, zt + tb], Z, yb - ya - 20, 60);
      }
    }
  }
  if (rubber.length) b.koop('rubbermat', 1, rubber.map((r) => r.g), { naam: 'Rubberen inleg in de goten en bakken (3 mm, gelijmd)', oppervlak: Math.round(rubber.reduce((s, r) => s + r.opp, 0) * 100) / 100 });
  const G = c.kg ?? 200, sp = Math.max(...xs.slice(1).map((x, i) => x - xs[i]));
  const gl = b.o.delen.find((d) => /^Gootligger/.test(d.naam)), lg = b.o.delen.find((d) => /^Ligger laag/.test(d.naam));
  if (gl) b.reken('Gootligger van een laag (volle goot tussen 2 eindframes)', gl, 'ligger', sp, 0, { g: Math.round((G * sp) / L), proef: 'opslagpen' });
  if (lg) b.reken('Ligger van een bak (halve laag, 2 steunpunten)', lg, 'ligger', sp, 0, { g: G / 2, proef: 'opslagpen' });
  c.lagen.forEach((l, k) => b.last(`Laag ${k + 1} vol`, G, [0, l.d / 2, l.z], { geval: 'vol' }));
}

/** paal met houders op een gelaserde basisplaat (of een wandstrip): c = { H, houders: [{ z, dir: [x,y], L }], muur, voet } */
export function paalHouders(b, def, c) {
  const P = b.P(c.rol ?? 'staander'), a = P.b, H = mt(b, c.H ?? 1500, [-200, 200]);
  const f = Math.min(1, H / (c.H ?? 1500)); // compact: de houders schuiven mee naar beneden
  if (c.muur) {
    b.o.muur = a / 2 + 8; // het muurvlak, achter de muurplaten
    const p = staander(b, 'Wandstrip', c.rol ?? 'staander', 0, 0, 300, 300 + H);
    for (const z of [400, 250 + H]) b.plaat('Muurplaat', [-90, a / 2, z - 60], [90, a / 2 + 8, z + 60], { gaten: [[-66, z], [66, z]].map(([dx, zz]) => ({ p: [dx, a / 2, zz], d: 14 })), opm: 'muurplaat 8 mm, 2 x M12 keilbout' });
    b.o.context.push(balk([-450, a / 2 + 68, (H + 700) / 2], [450, a / 2 + 68, (H + 700) / 2], Z, H + 700, 120, false, 'muur'));
    for (const h of c.houders) houder(b, p, [0, 0, 300 + h.z * f], [h.dir[0], h.dir[1], h.dir[2] ?? 0], h.L ?? 200, h.naam ?? 'Houder');
    b.o.verankerd = 'muur'; b.o.anker = { arm: 250, z: 600, n: 4, kg: (c.kg ?? 100) };
  } else {
    // basisplaat: gelaserd, ronde hoeken, 4 rubberpads eronder; paal erop met 4 driehoekschotten en een kopplaat
    const B = c.voet ?? 700, tb = pro(b) ? 12 : 10, zr = 8, R = Math.round(B * 0.18), zb = zr + tb, tk = 8;
    b.koop('rubbermat', 1, [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => balk([sx * (B / 2 - 70), sy * (B / 2 - 70), 0], [sx * (B / 2 - 70), sy * (B / 2 - 70), zr], X, 80, 80, true, 'rubber')), { naam: 'Rubberpads Ø80 x 8 onder de basisplaat (4 stuks, gelijmd)', oppervlak: 0.03 });
    b.contour('Basisplaat', [0, 0, zr + tb / 2], X, Y, tb, [[-B / 2, -B / 2, R], [B / 2, -B / 2, R], [B / 2, B / 2, R], [-B / 2, B / 2, R]], { banden: 12, opm: `gelaserde basisplaat ${tb} mm met ronde hoeken R${R}, rand gebroken; de paal erop gelast met 4 driehoekschotten` });
    const p = staander(b, 'Paal', 'staander', 0, 0, zb, zb + H);
    for (const d of [X, Y, [-1, 0, 0], [0, -1, 0]]) b.contour('Schot', [d[0] * a / 2, d[1] * a / 2, zb], d, Z, tk, [[0, 0], [110, 0], [110, 12], [12, 110], [0, 110]], { banden: 6, opm: `driehoekschot ${tk} mm, hoek afgeschuind, tegen de paal en op de basisplaat gelast` });
    b.contour('Kopplaat', [0, 0, zb + H + 4], X, Y, 8, [[-a / 2 - 5, -a / 2 - 5, 8], [a / 2 + 5, -a / 2 - 5, 8], [a / 2 + 5, a / 2 + 5, 8], [-a / 2 - 5, a / 2 + 5, 8]], { banden: 4, opm: 'kopplaat 8 mm met ronde hoeken R8, 5 mm overstek, rondom gelast' });
    for (const h of c.houders) houder(b, p, [0, 0, zb + h.z * f], [h.dir[0], h.dir[1], h.dir[2] ?? 0], h.L ?? 250, h.naam ?? 'Schijfhouder');
  }
  b.reken('Houder (volle houder, uitkragend)', b.o.delen.find((d) => /^(Houder|Schijfhouder)/.test(d.naam)), 'uitkrager', c.houders[0].L ?? 250, 0, { g: c.kg ?? 60, proef: 'schijfhouder', las: true });
  b.last('Volle houders', (c.kg ?? 60) * c.houders.length, [0, 0, 600], { geval: 'vol' });
}

/** parallettes (paar): gebogen buis Ø32 met voeten, rubberdoppen */
export function parallettes(b, def, c) {
  const h = c.h ?? 250, L = c.L ?? 600;
  for (const sx of [-1, 1]) {
    b.groep(`Parallette ${sx < 0 ? 'L' : 'R'}`);
    b.buis('Parallette', 'greep', [[sx * 250, -L / 2, 8], [sx * 250, -L / 2, h], [sx * 250, L / 2, h], [sx * 250, L / 2, 8]], { vlak: [1, 0, 0], R: 100, opm: `buis Ø32 gebogen tot een U (2 bochten R100), hoogte ${h} mm; rubberdop op de voeten` });
    for (const ye of [-L / 2, L / 2]) b.plaat('Voetplaat', [sx * 250 - 45, ye - 70, 0], [sx * 250 + 45, ye + 70, 8], { opm: 'voetplaat 8 mm met ronde hoeken en rubber eronder; de buis erop gelast' });
  }
  b.groep('frame');
  b.reken('Parallette (gebruiker in handstand, op één)', b.o.delen.find((d) => d.naam === 'Parallette'), 'ligger', L - 240, b.V.gebruiker, { proef: 'intrinsiek' });
  b.last('Gebruiker', 100, [0, 0, h + 400], { geval: 'steun' });
}
/** plyobox in staal (v6, P1-12): taps (onderaan e mm breder per zijde, zoals de stalen boxen van de merken), een mantel
 *  uit één gezette plaat (4 zettingen R30, gelast op één hoek), bodem, deksel 4 mm op 3 ribben met antislip en een
 *  rubberen rand, handgrepen als uitsparing in de zijkanten. Belastinggeval: landing op de rand (2 x gebruiker, 30 %
 *  horizontaal). */
export function plyobox(b, def, c) {
  const [B, D, H] = c.maat ?? [600, 500, 500], P = b.P('licht'), a = P.h, tm = 2, td = c.td ?? 4, R = 30, zr = 5, z0 = zr + tm, z1 = H - td, e = c.taps ?? 100;
  const Bb = B + 2 * e, Db = D + 2 * e, hz = z1 - z0, Ls = Math.hypot(e, hz), sn = e / Ls, cs = hz / Ls;
  b.koop('rubbermat', 1, [[-1, 0], [1, 0]].map(([sx]) => balk([sx * (Bb / 2 - 40), -Db / 2 + 20, zr / 2], [sx * (Bb / 2 - 40), Db / 2 - 20, zr / 2], X, 50, zr, false, 'rubber')), { naam: 'Rubberstroken 50 x 5 onder de box (antislip, geluid)', oppervlak: (2 * 0.05 * (Db - 40)) / 1e3 });
  const rh = (w, hh, r = R) => [[-w / 2, -hh / 2, r], [w / 2, -hh / 2, r], [w / 2, hh / 2, r], [-w / 2, hh / 2, r]];
  b.contour('Bodem', [0, 0, zr + tm / 2], X, Y, tm, rh(Bb, Db), { banden: 8, opm: `bodem ${tm} mm, gelaserd met ronde hoeken R${R}, aan de mantel gelast` });
  b.contour('Deksel', [0, 0, H - td / 2], X, Y, td, rh(B, D), { banden: 8, opm: `deksel ${td} mm met ronde hoeken R${R} en antislip (kwartszand), op de mantel en 3 ribben gelast` });
  // mantel: 4 schuine vlakken (trapezium), de hoeken zijn zettingen R30; de zijkanten met een handgreep
  const grip = [[-65, Ls - 140, 17], [65, Ls - 140, 17], [65, Ls - 105, 17], [-65, Ls - 105, 17]];
  const vlakken = [];
  for (const sy of [-1, 1]) {
    const ey = norm([0, -sy * e, hz]), o3 = add([0, sy * Db / 2, z0], mul(norm([0, -sy * cs, -sn]), tm / 2));
    vlakken.push(b.contour('Mantel', o3, X, ey, tm, sy < 0 ? [[-(Bb / 2 - R), 0], [Bb / 2 - R, 0], [B / 2 - R, Ls], [-(B / 2 - R), Ls]] : [[-(Bb / 2 - R), 0], [-(B / 2 - R), Ls], [B / 2 - R, Ls], [Bb / 2 - R, 0]], { banden: 6, opm: 'mantel (voor/achter)' }));
  }
  for (const sx of [-1, 1]) {
    const ey = norm([-sx * e, 0, hz]), o3 = add([sx * Bb / 2, 0, z0], mul(norm([-sx * cs, 0, -sn]), tm / 2));
    vlakken.push(b.contour('Mantel', o3, Y, ey, tm, sx < 0 ? [[-(Db / 2 - R), 0], [-(D / 2 - R), Ls], [D / 2 - R, Ls], [Db / 2 - R, 0]] : [[-(Db / 2 - R), 0], [Db / 2 - R, 0], [D / 2 - R, Ls], [-(D / 2 - R), Ls]], { banden: 6, uitsparingen: [grip], opm: 'mantel (zijkant) met een handgreep 130 x 35' }));
  }
  // uitslag van de mantel: voor → rechts → achter → links, de 4e hoek is de lasnaad
  const q = (p0, p1, p2, p3) => [p0, p1, p2, p3];
  const pan = [
    { q: q([-(Bb / 2 - R), -Db / 2, z0], [Bb / 2 - R, -Db / 2, z0], [B / 2 - R, -D / 2, z1], [-(B / 2 - R), -D / 2, z1]) },
    { q: q([Bb / 2, -(Db / 2 - R), z0], [Bb / 2, Db / 2 - R, z0], [B / 2, D / 2 - R, z1], [B / 2, -(D / 2 - R), z1]), gaten: [grip.map(([u, v, r]) => [u + (Db / 2 - R), v, r])] },
    { q: q([Bb / 2 - R, Db / 2, z0], [-(Bb / 2 - R), Db / 2, z0], [-(B / 2 - R), D / 2, z1], [B / 2 - R, D / 2, z1]) },
    { q: q([-Bb / 2, Db / 2 - R, z0], [-Bb / 2, -(Db / 2 - R), z0], [-B / 2, -(D / 2 - R), z1], [-B / 2, D / 2 - R, z1]), gaten: [grip.map(([u, v, r]) => [u + (Db / 2 - R), v, r])] },
  ];
  const ui = ontvouw(pan, [0, 1, 2].map(() => ({ hoek: 90, R, richting: 'op' })), tm);
  b.gezet('Mantel', vlakken, { t: tm, uitslag: ui, opm: `mantel uit één plaat ${tm} mm, taps (${e} mm per zijde), 3 zettingen 90° Ri ${R} (K = 0,4) en een lasnaad op de 4e hoek; 2 handgrepen 130 x 35` });
  // de ronde zettingen in de hoeken (alleen voor het beeld): schuine cilinders
  b.o.pronk = b.o.pronk ?? [];
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) b.o.pronk.push(balk([sx * (Bb / 2 - R), sy * (Db / 2 - R), z0], [sx * (B / 2 - R), sy * (D / 2 - R), z1], X, 2 * R, 2 * R, true, 'frame'));
  b.o.pronk.push(balk([-B / 2 + 25, 0, H + 0.4], [B / 2 - 25, 0, H + 0.4], Y, D - 50, 0.8, false, 'eindkap'));
  b.koop('antislip', 1, [], { naam: 'Antislip (kwartszand) op het deksel', oppervlak: Math.round(((B - 50) * (D - 50)) / 1e4) / 100 });
  b.koop('rubbermat', 1, [[0, -D / 2, B], [0, D / 2, B]].map(([x, y, l]) => balk([x - l / 2, y, H - 6], [x + l / 2, y, H - 6], Z, 16, 8, false, 'rubber')).concat([-1, 1].map((sx) => balk([sx * B / 2, -D / 2, H - 6], [sx * B / 2, D / 2, H - 6], Z, 16, 8, false, 'rubber'))), { naam: 'Rubberen kantprofiel rond het deksel (U 16 x 8)', oppervlak: ((2 * (B + D)) * 0.03) / 1e3 });
  // 3 ribben onder het deksel (langs x), tegen de mantel
  const ribY = [-D / 4, 0, D / 4], xr = B / 2 - tm - 4;
  const ribben = ribY.map((y) => b.staaf('Ribbe', 'licht', [-xr, y, z1 - a / 2], [xr, y, z1 - a / 2], { kap: false, opm: 'ribbe onder het deksel, tegen de mantel gelast' }));
  b.reken('Ribbe onder het deksel (landing, dynamisch x 2)', ribben[1], 'ligger', 2 * xr, b.V.gebruiker * 2, { proef: 'intrinsiek' });
  {
    // deksel tussen de ribben: strook 200 mm, overspanning D/4, vrij opgelegd (veilige kant)
    const F = 2 * b.V.gebruiker * 9.81, Lp = D / 4, M = (F * Lp) / 4, W = (200 * td ** 2) / 6, s = M / W;
    b.toets('Sterkte', `Deksel ${td} mm tussen de ribben (landing)`, `F = 2 · ${b.V.gebruiker} kg · g = ${(F / 1000).toFixed(2).replace('.', ',')} kN; strook 200 mm (AANNAME), overspanning ${Lp} mm vrij opgelegd: M = F·L/4 = ${Math.round(M / 1000)} Nm; W = 200·${td}²/6 = ${Math.round(W)} mm³: σ = ${Math.round(s)} N/mm² ≤ 235`, s / 235, 'EN 1993-1-1 §6.2.5 (plaatstrook)');
    // landing op 50 mm van de bovenrand met 30 % horizontaal: kantelen om de onderrand (e mm verder uit)
    const m = b.o.delen.reduce((t, d) => t, 0), Fh = 0.3 * F, Mk = Fh * H / 1000, mBox = (Bb * Db * tm + B * D * td) * 7.85e-6 + 4 * ((B + Bb) / 2) * Ls * tm * 7.85e-6 + 3 * 2 * xr * P.kgm / 1000;
    const Mt = F * (50 + e) / 1000 + mBox * 9.81 * (Db / 2) / 1000;
    b.toets('Stabiliteit', 'Landing op de rand (50 mm), 2 x gebruiker, 30 % horizontaal', `kantelmoment 0,3 · ${(F / 1000).toFixed(2).replace('.', ',')} kN · ${H} mm = ${Math.round(Mk)} Nm; tegenmoment: landing ${50 + e} mm binnen de onderrand + box ${Math.round(mBox)} kg op ${Db / 2} mm = ${Math.round(Mt)} Nm`, Mk / Mt, 'AANNAME: belastinggeval sprong op de rand (Fable 5.2 §4.3)');
    void m;
  }
  b.last('Gebruiker op de box', 100, [0, 0, H + 900], { geval: 'sprong' });
}
/** schijvenkar: voetframe op 4 zwenkwielen, middenpaal met 4 schuine houders en een duwbeugel */
export function schijvenkar(b, def, c) {
  const P = b.P('staander'), a = P.b, B = 700, D = 600;
  const v1 = b.staaf('Voet voor', 'staander', [-B / 2, -D / 2, 90], [B / 2, -D / 2, 90]), v2 = b.staaf('Voet achter', 'staander', [-B / 2, D / 2, 90], [B / 2, D / 2, 90]);
  b.staaf('Voet midden', 'staander', [0, -D / 2 + a / 2, 90], [0, D / 2 - a / 2, 90]);
  b.koop(b.V.wiel, 4, [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => balk([sx * (B / 2 - 60), sy * D / 2, 0], [sx * (B / 2 - 60), sy * D / 2, 90 - a / 2], [1, 0, 0], 50, 50, true, 'rubber')), { naam: 'Zwenkwiel onder de kar (2 met rem)' });
  const p = staander(b, 'Paal', 'staander', 0, 0, 90 + a / 2, 1150);
  for (const [z, d] of [[400, [1, 0, 0.27]], [400, [-1, 0, 0.27]], [800, [1, 0, 0.27]], [800, [-1, 0, 0.27]]]) houder(b, p, [0, 0, z], d, 250);
  b.staaf('Duwbeugel', 'greep', [-250, -a / 2 - 120, 1050], [250, -a / 2 - 120, 1050], { opm: 'buis Ø32 met rubber handvat' });
  b.staaf('Beugelarm', 'licht', [0, -a / 2, 1050], [0, -a / 2 - 120 + 16, 1050], { kap: true });
  b.reken('Schijfhouder (volle houder)', b.o.delen.find((d) => d.naam === 'Schijfhouder'), 'uitkrager', 250, 0, { g: 60, proef: 'schijfhouder', las: true });
  b.last('Volle kar', 240, [0, 0, 600], { geval: 'vol' });
  void v1; void v2;
}

const MO = (t, p, bt, bp) => ({ thuis: t, pro: p, bronT: bt, bronP: bp });
const O = (id, naam, kort, uitleg, maxLast, markt, cfg, bouw = rekLagen) => ({ id, soort: 'opslag', naam, kort, uitleg, spieren: '-', oefeningen: ['opbergen'], maxLast, markt, maten: MATEN, cfg, bouw(b) { bouw(b, this, this.cfg); } });
const R2 = (z1, z2, d = 380, s = 'halter') => [{ z: z1, d, soort: s }, { z: z2, d: d - 40, soort: s }];
export const OPSLAG = [
  O('FO-01', 'Halterrek 2 lagen kort', 'Halterrek 1,2 m met 2 schuine lagen.', 'Twee eindframes met zijplaat en ronde voeten; per laag een V-goot in gezette plaat met rubber, 15° naar voren; voor 5 paar halters.', { thuis: 150, pro: 250 }, MO([180, 400], [450, 1100], 'Gorilla / Bodycraft halterrek ± € 180-400', 'Rogue / Eleiko dumbbell rack ± € 450-1100'), { L: 1200, lagen: R2(420, 760), kg: 200 }),
  O('FO-02', 'Halterrek 2 lagen lang', 'Halterrek 1,8 m met 2 schuine lagen en middenframe.', 'Drie eindframes met zijplaten; per laag een V-goot in gezette plaat met rubber, 15° naar voren; voor 10 paar halters.', { thuis: 300, pro: 450 }, MO([300, 600], [700, 1600], 'Gorilla / ATX halterrek 10 paar ± € 300-600', 'Rogue DR-2 / Eleiko ± € 700-1600'), { L: 1800, lagen: R2(420, 760), kg: 300 }),
  O('FO-03', 'Halterrek 3 lagen', 'Halterrek 1,5 m met 3 schuine lagen.', 'Twee eindframes met zijplaat; drie V-goten in gezette plaat met rubber, 15° naar voren; voor 15 paar lichte halters.', { thuis: 300, pro: 400 }, MO([250, 550], [650, 1400], 'Gorilla / ATX 3 lagen ± € 250-550', 'Rogue / Eleiko 3 tier ± € 650-1400'), { L: 1500, lagen: [{ z: 350, d: 420, soort: 'halter' }, { z: 650, d: 380, soort: 'halter' }, { z: 930, d: 340, soort: 'halter' }], kg: 200 }),
  O('FO-04', 'Kettlebellrek 2 legplaten', 'Rek met 2 gezette bakken met opstaande randen en rubbermat.', 'Twee eindframes met zijplaat, twee gezette bakken (randen 40 mm) met rubbermat; voor 10-14 kettlebells.', { thuis: 300, pro: 500 }, MO([200, 450], [550, 1200], 'Gorilla / ATX kettlebellrek ± € 200-450', 'Rogue KB rack ± € 550-1200'), { L: 1300, lagen: [{ z: 300, d: 420, soort: 'plank' }, { z: 700, d: 420, soort: 'plank' }], kg: 250 }),
  O('FO-05', 'Ballenrek 2 lagen', 'Rek voor medicine balls en wall balls.', 'Twee eindframes met zijplaat, per laag een brede V-goot in gezette plaat met rubber waarin de ballen liggen.', { thuis: 100, pro: 150 }, MO([150, 350], [400, 900], 'Gorilla / ATX ballenrek ± € 150-350', 'Rogue / Eleiko ball rack ± € 400-900'), { L: 1500, lagen: [{ z: 450, d: 420, soort: 'bal' }, { z: 950, d: 420, soort: 'bal' }], kg: 80 }),
  O('FO-06', 'Ballenrek 3 lagen', 'Hoog rek voor 9-12 ballen.', 'Twee eindframes met zijplaat, drie brede V-goten met rubber voor de ballen.', { thuis: 150, pro: 200 }, MO([200, 450], [500, 1100], 'ATX ballenrek 3 lagen ± € 200-450', 'Rogue ball rack ± € 500-1100'), { L: 1500, lagen: [{ z: 400, d: 420, soort: 'bal' }, { z: 850, d: 420, soort: 'bal' }, { z: 1300, d: 420, soort: 'bal' }], kg: 80 }),
  O('FO-07', 'Opbergrek 3 legplaten', 'Rek met 3 gezette bakken voor kleine spullen.', 'Twee eindframes met zijplaat, drie gezette bakken met rubbermat; voor kettlebells, plaatjes en accessoires.', { thuis: 200, pro: 300 }, MO([200, 450], [500, 1100], 'Gorilla / ATX opbergrek ± € 200-450', 'Rogue / Eleiko storage ± € 500-1100'), { L: 1500, lagen: [{ z: 300, d: 460, soort: 'plank' }, { z: 750, d: 460, soort: 'plank' }, { z: 1200, d: 460, soort: 'plank' }], kg: 150 }),
  O('FO-08', 'Halterrek lang met plank', 'Halterrek 2,1 m: 2 schuine V-goten en een bak bovenaan.', 'Drie eindframes met zijplaten; twee V-goten met rubber (15°) voor halters en een gezette bak voor kettlebells.', { thuis: 300, pro: 450 }, MO([350, 700], [900, 1900], 'ATX halterrek 2,1 m ± € 350-700', 'Rogue / Eleiko ± € 900-1900'), { L: 2100, lagen: [{ z: 400, d: 420, soort: 'halter' }, { z: 720, d: 380, soort: 'halter' }, { z: 1000, d: 360, soort: 'plank' }], kg: 300 }),
  O('FO-09', 'Schijvenboom compact', 'Paal met 4 schijfhouders op een kruisvoet.', 'Gelaserde basisplaat met ronde hoeken en rubberpads, paal met schotten en 4 houders met rubberen huls en eindkap.', { thuis: 150, pro: 200 }, MO([120, 250], [300, 700], 'Gorilla / ATX schijvenboom ± € 120-250', 'Rogue / Eleiko plate tree ± € 300-700'), { H: 1100, houders: [{ z: 350, dir: [1, 0] }, { z: 350, dir: [-1, 0] }, { z: 750, dir: [1, 0] }, { z: 750, dir: [-1, 0] }], kg: 60, voet: 700 }, paalHouders),
  O('FO-10', 'Schijvenboom 8 houders', 'Paal met 8 schijfhouders in vier richtingen.', 'Gelaserde basisplaat, paal en 8 houders met rubberen huls: twee hoogtes in vier richtingen.', { thuis: 300, pro: 400 }, MO([200, 400], [450, 950], 'ATX plate tree 8 ± € 200-400', 'Rogue / Eleiko ± € 450-950'), { H: 1200, houders: [[1, 0], [-1, 0], [0, 1], [0, -1]].flatMap((d) => [{ z: 380, dir: d }, { z: 820, dir: d }]), kg: 60, voet: 900 }, paalHouders),
  O('FO-11', 'Bumperplaatrek', 'Paal met schuine houders voor bumperplaten.', 'Gelaserde basisplaat en paal met 4 schuin omhoog wijzende houders (15°) met rubberen huls: de schijven kunnen er niet af rollen.', { thuis: 200, pro: 300 }, MO([180, 350], [400, 850], 'Gorilla bumper plate rack ± € 180-350', 'Rogue bumper storage ± € 400-850'), { H: 1000, houders: [{ z: 400, dir: [1, 0, 0.27] }, { z: 400, dir: [-1, 0, 0.27] }, { z: 750, dir: [1, 0, 0.27] }, { z: 750, dir: [-1, 0, 0.27] }], kg: 75, voet: 800 }, paalHouders),
  O('FO-12', 'Wandstrip schijven', 'Wandstrip met 4 schijfhouders.', 'Koker tegen de muur met 2 muurplaten en 4 schijfhouders naar voren.', { thuis: 150, pro: 200 }, MO([100, 200], [250, 600], 'Gorilla wall plate holder ± € 100-200', 'Rogue wall mount plate storage ± € 250-600'), { muur: true, H: 1200, houders: [300, 600, 900, 1200].map((z) => ({ z: z - 150, dir: [0, -1], L: 220 })), kg: 50 }, paalHouders),
  O('FO-13', 'Wandstrip haken', 'Wandstrip met 6 haken voor banden, touwen en riemen.', 'Koker tegen de muur met 2 muurplaten en 6 korte haken (rond Ø25, kop afgerond).', { thuis: 60, pro: 80 }, MO([60, 150], [150, 400], 'wandhaken accessoires ± € 60-150', 'Rogue hanger / wall storage ± € 150-400'), { muur: true, H: 1300, rol: 'licht', houders: [200, 400, 600, 800, 1000, 1200].map((z) => ({ z, dir: [0, -1, 0.2], L: 150, naam: 'Houder haak' })), kg: 15 }, paalHouders),
  O('FO-14', 'Parallettes hoog (paar)', 'Twee parallettes van 25 cm in gebogen buis.', 'Elke parallette is één gebogen buis Ø32 met voetplaatjes en rubber; voor L-sits, handstanden en dips.', undefined, MO([60, 130], [150, 300], 'Gorilla / ATX parallettes ± € 60-130', 'Rogue / Eleiko parallettes ± € 150-300'), { h: 250 }, parallettes),
  O('FO-15', 'Parallettes laag (paar)', 'Twee lage parallettes van 12 cm.', 'Zoals de hoge parallettes, maar 12 cm hoog voor push-ups en planches.', undefined, MO([40, 90], [100, 220], 'mini parallettes ± € 40-90', 'Rogue mini ± € 100-220'), { h: 120, L: 450 }, parallettes),
  O('FO-16', 'Plyobox staal 50 cm', 'Dichte springbox in gezette plaat, 60 x 50 x 50 cm.', 'Mantel uit één gezette plaat met ronde hoeken, deksel met antislip, handgrepen in de zijkanten en rubber onderaan.', undefined, MO([80, 160], [180, 350], 'houten/schuim plyobox ± € 80-160', 'Rogue steel plyo box ± € 180-350'), { maat: [600, 500, 500] }, plyobox),
  O('FO-17', 'Plyobox staal 75 cm', 'Hoge springbox 75 x 60 x 75 cm.', 'Zoals de plyobox van 50 cm, maar 75 cm hoog en breder voor stabiliteit.', undefined, MO([110, 200], [240, 420], 'plyobox 75 ± € 110-200', 'Rogue steel plyo box ± € 240-420'), { maat: [750, 600, 750] }, plyobox),
  O('FO-18', 'Schijvenkar', 'Rijdende schijvenboom met 4 houders en duwbeugel.', 'Voetframe op 4 zwenkwielen (2 met rem), paal met 4 schuine houders en een duwbeugel.', { thuis: 200, pro: 240 }, MO([200, 400], [450, 900], 'ATX plate trolley ± € 200-400', 'Eleiko / Rogue plate cart ± € 450-900'), {}, schijvenkar),
  O('FO-19', 'Opbergrek 4 legplaten', 'Hoog opbergrek 1,8 m met 4 legplaten.', 'Drie eindframes met zijplaten, vier gezette bakken met rubbermat.', { thuis: 150, pro: 250 }, MO([250, 550], [650, 1400], 'ATX opbergrek ± € 250-550', 'Rogue / Eleiko storage ± € 650-1400'), { L: 1800, lagen: [{ z: 250, d: 460, soort: 'plank' }, { z: 650, d: 460, soort: 'plank' }, { z: 1050, d: 460, soort: 'plank' }, { z: 1450, d: 460, soort: 'plank' }], kg: 150 }),
  O('FO-20', 'Halterrek 3 lagen lang', 'Halterrek 2,1 m met 3 schuine lagen.', 'Drie eindframes met zijplaten, drie V-goten met rubber, 15° naar voren; voor 20 paar halters.', { thuis: 300, pro: 400 }, MO([400, 800], [1000, 2200], 'ATX 3 lagen 2,1 m ± € 400-800', 'Rogue / Eleiko ± € 1000-2200'), { L: 2100, lagen: [{ z: 350, d: 420, soort: 'halter' }, { z: 650, d: 380, soort: 'halter' }, { z: 930, d: 340, soort: 'halter' }], kg: 300 }),
  O('FO-21', 'Opbergbank', 'Lage bank met legplaat onder en zitvlak bovenaan.', 'Twee eindframes met zijplaat, een gezette bak op 20 cm en een zitplaat met kussen op 45 cm: om op te zitten en spullen onder te leggen.', { thuis: 150, pro: 200 }, MO([120, 250], [300, 650], 'opbergbank ± € 120-250', 'Rogue / Eleiko storage bench ± € 300-650'), { L: 1200, lagen: [{ z: 200, d: 380, soort: 'plank' }, { z: 450, d: 380, soort: 'plank', zit: true }], kg: 150 }),
  O('FO-22', 'Wandstrip kettlebells', 'Wandstrip met 5 lange houders voor kettlebells.', 'Koker tegen de muur met 2 muurplaten en 5 schuine houders van 300 mm.', { thuis: 150, pro: 200 }, MO([80, 180], [200, 450], 'wandrek kettlebells ± € 80-180', 'Rogue KB wall storage ± € 200-450'), { muur: true, H: 1300, houders: [200, 450, 700, 950, 1200].map((z) => ({ z, dir: [0, -1, 0.15], L: 300 })), kg: 40 }, paalHouders),
  O('FO-23', 'Wandstrip stangen', 'Wandstrip met 4 paar haken voor stangen.', 'Koker tegen de muur met 2 muurplaten en 4 paar korte haken naar links en rechts (stangen horizontaal).', { thuis: 100, pro: 150 }, MO([80, 180], [200, 500], 'gun rack muur ± € 80-180', 'Rogue horizontal bar storage ± € 200-500'), { muur: true, H: 1200, houders: [250, 550, 850, 1150].flatMap((z) => [{ z, dir: [1, -0.3, 0.2], L: 140, naam: 'Houder stang' }, { z, dir: [-1, -0.3, 0.2], L: 140, naam: 'Houder stang' }]), kg: 25 }, paalHouders),
  O('FO-24', 'Bandenpaal', 'Vrijstaande paal met 8 pinnen voor banden en touwen.', 'Gelaserde basisplaat en paal met 8 korte schuine pinnen met rubberen huls in vier richtingen.', { thuis: 50, pro: 80 }, MO([60, 130], [150, 350], 'band/rope stand ± € 60-130', 'Rogue band storage ± € 150-350'), { H: 1500, houders: [[1, 0], [-1, 0], [0, 1], [0, -1]].flatMap((d) => [{ z: 800, dir: [...d, 0.3], L: 160, naam: 'Houder haak' }, { z: 1300, dir: [...d, 0.3], L: 160, naam: 'Houder haak' }]), kg: 10, voet: 700 }, paalHouders),
  O('FO-25', 'Schijvenboom bumpers en stangen', 'Paal met 4 schijfhouders en 2 stanghouders bovenaan.', 'Gelaserde basisplaat, paal met 4 houders met rubberen huls en bovenaan 2 houders waar je stangen rechtop in zet.', { thuis: 250, pro: 350 }, MO([200, 400], [500, 1000], 'ATX plate tree met stanghouders ± € 200-400', 'Rogue / Eleiko combo ± € 500-1000'), { H: 1300, houders: [{ z: 350, dir: [1, 0] }, { z: 350, dir: [-1, 0] }, { z: 750, dir: [1, 0] }, { z: 750, dir: [-1, 0] }, { z: 1150, dir: [0, 1, 0.5], L: 200, naam: 'Stanghouder' }, { z: 1150, dir: [0, -1, 0.5], L: 200, naam: 'Stanghouder' }], kg: 60, voet: 900 }, paalHouders),
];
void pro;
