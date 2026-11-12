// Montage per deur: hoe de stukken van DIT profielsysteem samenkomen, als kleine 3D-scènes (uit elkaar en samen):
// de hoek van de vleugel (staal: verstek gelast; aluminium: verstek met hoekverbinder en stelschroeven), de roede tegen
// het kader (gelast, verzonken bout in een T-verbinder, of schroeven in het schroefkanaal), het glas (gelaste lat en
// geschroefde hoeklijn, klikglaslat op clips of tapeinden, L-profielen met kit, of U-rubber in de gleuf) en de pivot
// (onder en boven) of de verdekte scharnieren. Elke scène bestaat uit convexe prisma's in mm (x naar rechts, y omhoog,
// z de diepte, 0 = voorkant met de greep): de pagina bouwt er de 3D mee (verbinding3d.mjs), montage.mjs tekent ze
// isometrisch op een blad. Onderdelen, bevestigingsmiddelen (met norm) en stappen staan erbij. Werkt in Node en browser.
import { STAAF } from './prijzen.mjs';
import { MATEN } from './deuren.mjs';
import { SCHARNIEREN } from './opties.mjs';
import { sectie } from './profielen.mjs';

export const KLEUR = {
  staal: '#7d848c', alu: '#c5ccd3', verbinder: '#4f86c6', bout: '#e2b33c', las: '#e8590c', lijm: '#f2c94c', glas: '#9fd0e3',
  rubber: '#2b2d31', iso: '#9b7a52', vloer: '#d8d1c4', pivot: '#4b5560', plaat: '#8f969e', kit: '#f4f6f7', gat: '#1d1f22',
};

// ---------------------------------------------------------------- prisma's
/** prisma: veelhoek pts (u, v) in het vlak loodrecht op 'as', van a0 tot a1; pts1 = andere veelhoek bovenaan (afgeknotte kegel) */
const P = (as, pts, a0, a1, pts1 = null) => ({ as, pts, a0, a1, pts1 });
const naar3 = (as, [u, v], a) => (as === 'z' ? [u, v, a] : as === 'x' ? [a, u, v] : [u, a, v]);
const cirkel = (cu, cv, r, n = 14) => Array.from({ length: n }, (_, i) => [cu + r * Math.cos((2 * Math.PI * i) / n), cv + r * Math.sin((2 * Math.PI * i) / n)]);
/** cilinder langs een as */
const cil = (as, cu, cv, r, a0, a1, n = 14) => P(as, cirkel(cu, cv, r, n), a0, a1);
/** afgeknotte kegel (verzonken kop): straal r0 op a0, r1 op a1 */
const kegel = (as, cu, cv, r0, r1, a0, a1, n = 16) => P(as, cirkel(cu, cv, r0, n), a0, a1, cirkel(cu, cv, r1, n));
const doos = (x0, x1, y0, y1, z0, z1) => P('z', [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], z0, z1);

/** de vlakken van een prisma: [{ pts: [[x,y,z]...], n: normaal naar buiten }] */
export function vlakken(s) {
  const a = s.pts.map((p) => naar3(s.as, p, s.a0)), b = (s.pts1 ?? s.pts).map((p) => naar3(s.as, p, s.a1)), n = a.length;
  const c = [0, 1, 2].map((k) => (a.reduce((t, p) => t + p[k], 0) + b.reduce((t, p) => t + p[k], 0)) / (2 * n));
  const ruw = [a.slice().reverse(), b, ...a.map((p, i) => [p, a[(i + 1) % n], b[(i + 1) % n], b[i]])];
  return ruw.map((pts) => {
    const m = [0, 1, 2].map((k) => pts.reduce((t, p) => t + p[k], 0) / pts.length);
    // normaal (Newell), naar buiten gedraaid
    let nx = 0, ny = 0, nz = 0;
    for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; nx += (p[1] - q[1]) * (p[2] + q[2]); ny += (p[2] - q[2]) * (p[0] + q[0]); nz += (p[0] - q[0]) * (p[1] + q[1]); }
    const l = Math.hypot(nx, ny, nz) || 1;
    let nn = [nx / l, ny / l, nz / l];
    if (nn[0] * (m[0] - c[0]) + nn[1] * (m[1] - c[1]) + nn[2] * (m[2] - c[2]) < 0) { nn = nn.map((x) => -x); pts = pts.slice().reverse(); }
    return { pts, n: nn, m };
  });
}

// ---------------------------------------------------------------- profielen als wanden
/** wanden van een doorsnede (v = zichtbreedte, z = diepte) langs x (regel) of y (stijl), met een verstek op de hoek (x = y) */
function staaf(sec, L, richting, { verstek = false, x0 = 0, y0 = 0, z0 = 0, van = 0, spiegel = false } = {}) {
  return sec.wanden.map((w) => {
    const [v0, v1] = spiegel ? [sec.V - w.v1, sec.V - w.v0] : [w.v0, w.v1];
    const pts = richting === 'x'
      ? (verstek ? [[v0, y0 + v0], [L, y0 + v0], [L, y0 + v1], [v1, y0 + v1]] : [[van, y0 + v0], [L, y0 + v0], [L, y0 + v1], [van, y0 + v1]])
      : (verstek ? [[x0 + v0, v0], [x0 + v1, v1], [x0 + v1, L], [x0 + v0, L]] : [[x0 + v0, van], [x0 + v1, van], [x0 + v1, L], [x0 + v0, L]]);
    return { ...P('z', pts, z0 + w.z0, z0 + w.z1), iso: !!w.iso, rubber: !!w.rubber };
  });
}
/** een deel uit wanden: isolatiestroken en rubber in hun eigen kleur */
function profielDeel(naam, label, solids, kleur, uit, extra = {}) {
  const gewoon = solids.filter((s) => !s.iso && !s.rubber), iso = solids.filter((s) => s.iso), rub = solids.filter((s) => s.rubber);
  const d = [{ naam, label, kleur, solids: gewoon, uit, ...extra }];
  if (iso.length) d.push({ naam: `${naam}: isolatiestroken`, label: 'kunststof isolatiezone (niet lassen, niet verhitten)', kleur: KLEUR.iso, solids: iso, uit, geenNr: true });
  if (rub.length) d[0].kleur = KLEUR.rubber;
  return d;
}
/** de grootste holte van een profiel (voor een hoekverbinder): { v0, v1, z0, z1 } */
function holte(sec, st) {
  if (st?.holte) { const t = st.wand ?? 2; return { v0: t, v1: t + st.holte[0], z0: t, z1: t + st.holte[1] }; }
  const t = sec.t || 2; return { v0: t, v1: sec.V - t, z0: t, z1: sec.D - t };
}
/** verzonken bout of schroef (ISO 10642 / ISO 7050) langs as, kop op a0, punt richting a0 + L*zin */
function verzonken(as, cu, cv, a0, zin, d, L, kop) {
  const h = (kop - d) / 2; // kop 90°: hoogte = (kop - d) / 2
  return [kegel(as, cu, cv, kop / 2, d / 2, a0, a0 + zin * h), cil(as, cu, cv, d / 2, a0 + zin * h, a0 + zin * L)];
}

// ---------------------------------------------------------------- echte gaten (met verzinking 90°)
/** veelhoek knippen op het halfvlak a*u + b*v <= c (Sutherland-Hodgman) */
function knipHalf(poly, a, b, c) {
  const uit = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length], fp = a * p[0] + b * p[1] - c, fq = a * q[0] + b * q[1] - c;
    if (fp <= 1e-9) uit.push(p);
    if ((fp < -1e-9 && fq > 1e-9) || (fp > 1e-9 && fq < -1e-9)) { const k = fp / (fp - fq); uit.push([p[0] + k * (q[0] - p[0]), p[1] + k * (q[1] - p[1])]); }
  }
  return uit;
}
const NGAT = 16;
/** een convexe veelhoek min een rond gat (straal r, NGAT zijden): de convexe sectoren rond het gat (null = leeg) */
function sectoren(poly, cu, cv, r) {
  return Array.from({ length: NGAT }, (_, i) => {
    const a0 = (2 * Math.PI * i) / NGAT, a1 = (2 * Math.PI * (i + 1)) / NGAT, d0 = [Math.cos(a0), Math.sin(a0)], d1 = [Math.cos(a1), Math.sin(a1)];
    const m = [(d0[0] + d1[0]) / 2, (d0[1] + d1[1]) / 2], ml = Math.hypot(...m), mm = [m[0] / ml, m[1] / ml];
    let q = knipHalf(poly, d0[1], -d0[0], d0[1] * cu - d0[0] * cv);
    q = knipHalf(q, -d1[1], d1[0], -d1[1] * cu + d1[0] * cv);
    q = knipHalf(q, -mm[0], -mm[1], -(mm[0] * cu + mm[1] * cv + r * Math.cos(Math.PI / NGAT)));
    return q.length >= 3 ? q : null;
  });
}
const binnenIn = (poly, u, v) => { let ok = true; for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; const c = (q[0] - p[0]) * (v - p[1]) - (q[1] - p[1]) * (u - p[0]); if (c < -1e-6) ok = false; } if (ok) return true; ok = true; for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; const c = (q[0] - p[0]) * (v - p[1]) - (q[1] - p[1]) * (u - p[0]); if (c > 1e-6) ok = false; } return ok; };
/** een rechthoekige doos omzetten naar een andere as (voor een gat dwars op de wand); null als het geen doos is */
function alsAs(s, as) {
  if (s.as === as) return s;
  if (s.pts1 || s.pts.length !== 4) return null;
  const v = [...s.pts.map((p) => naar3(s.as, p, s.a0)), ...s.pts.map((p) => naar3(s.as, p, s.a1))];
  const mn = [0, 1, 2].map((k) => Math.min(...v.map((p) => p[k]))), mx = [0, 1, 2].map((k) => Math.max(...v.map((p) => p[k])));
  if (v.some((p) => p.some((x, k) => Math.abs(x - mn[k]) > 1e-6 && Math.abs(x - mx[k]) > 1e-6))) return null;
  const [iu, iv, ia] = as === 'x' ? [1, 2, 0] : as === 'y' ? [0, 2, 1] : [0, 1, 2];
  return { ...s, ...P(as, [[mn[iu], mn[iv]], [mx[iu], mn[iv]], [mx[iu], mx[iv]], [mn[iu], mx[iv]]], mn[ia], mx[ia]) };
}
/**
 * boor een gat in de delen die 'welke' aanduidt: { as, cu, cv, r, R (verzinking, straal), van (vlak waar de boor
 * binnenkomt), zin (+1 / -1), diep }. Elke wand die het gat raakt wordt vervangen door sectoren rond het gat; de wand
 * waarvan het vlak op 'van' ligt krijgt de verzinking 90° (een kegel van R naar r).
 */
function boor(delen, g, welke) {
  const lo = Math.min(g.van, g.van + g.zin * g.diep), hi = Math.max(g.van, g.van + g.zin * g.diep), R = g.R ?? 0;
  const rad = (a) => (R > g.r ? Math.max(g.r, R - Math.abs(a - g.van)) : g.r);
  for (const d of delen) {
    if (!welke(d)) continue;
    d.solids = d.solids.flatMap((s0) => {
      const s = alsAs(s0, g.as);
      if (!s || s.pts1 || s.a1 <= lo + 1e-6 || s.a0 >= hi - 1e-6 || !binnenIn(s.pts, g.cu, g.cv)) return [s0];
      const knip = [...new Set([s.a0, s.a1, Math.max(s.a0, lo), Math.min(s.a1, hi), ...(R > g.r ? [g.van + g.zin * (R - g.r)] : [])].filter((a) => a >= s.a0 - 1e-9 && a <= s.a1 + 1e-9).map((a) => Math.round(a * 1e6) / 1e6))].sort((a, b) => a - b);
      const uit = [];
      for (let i = 0; i < knip.length - 1; i++) {
        const a = knip[i], b = knip[i + 1], m = (a + b) / 2;
        if (b - a < 1e-6) continue;
        if (m < lo || m > hi) { uit.push({ ...s, a0: a, a1: b, pts1: null }); continue; }
        const ra = rad(a), rb = rad(b), sa = sectoren(s.pts, g.cu, g.cv, ra), sb = sectoren(s.pts, g.cu, g.cv, rb);
        sa.forEach((q, k) => { if (!q) return; const q1 = sb[k]; uit.push({ ...s, as: g.as, pts: q, pts1: q1 && q1.length === q.length && Math.abs(ra - rb) > 1e-6 ? q1 : null, a0: a, a1: b, naad: true }); });
      }
      return uit;
    });
  }
}

// ---------------------------------------------------------------- de scènes
const PROF = (o) => (o.sys.alu ? KLEUR.alu : KLEUR.staal);
const glasDikte = (o) => o.glasDikte ?? 8.8;

/** hoek van de vleugel, linksonder: onderregel langs x, stijl langs y */
function hoek(o) {
  const sec = sectie(o, 'kader'), st = STAAF[o.sys.kader.staaf], K = sec.V, D = sec.D, Lh = 170, alu = !!o.sys.alu, E = alu ? 85 : 32, kl = PROF(o);
  const delen = [
    ...profielDeel('Onderregel van de vleugel', `${sec.naam}: verstek 45°`, staaf(sec, Lh, 'x', { verstek: true }), kl, [E, 0, 0]),
    ...profielDeel('Stijl van de vleugel', `${sec.naam}: verstek 45°`, staaf(sec, Lh, 'y', { verstek: true }), kl, [0, E, 0]),
  ];
  const middelen = [], stappen = [];
  if (!alu) {
    // lasnaden: op de voorkant en de achterkant langs het verstek, en in de buitenhoek over de diepte
    const r = 1.9, band = (z0, z1) => P('z', [[-r * 0.7, r * 0.7], [r * 0.7, -r * 0.7], [K + r * 0.7, K - r * 0.7], [K - r * 0.7, K + r * 0.7]], z0, z1);
    const schalen = sec.iso ? [[0, sec.iso[0]], [sec.iso[1], D]] : [[0, D]];
    delen.push({ naam: 'Lasnaad', label: sec.iso ? 'TIG, enkel op de stalen schalen (voor en achter)' : 'TIG op de zichtkant, MIG binnen; daarna vlak slijpen', kleur: KLEUR.las, uit: [0, 0, 0], alleenSamen: true,
      solids: [band(-1.1, 0.2), band(D - 0.2, D + 1.1), ...schalen.map(([a, b]) => cil('z', 0, 0, r, a, b, 8))] });
    stappen.push(
      `Zaag beide stukken in verstek 45° (zaagsnede haaks op de zichtkant). Ontbraam en ontvet 20 mm rond de naad.`,
      `Leg ze op de lastafel tegen twee haakse aanslagen, verstekken tegen elkaar (geen spleet, hoogstens 0,5 mm).`,
      `Hecht 4 punten: buitenhoek voor, buitenhoek achter, binnenhoek voor en achter. Meet de diagonalen van het kader (gelijk tot 1 mm).`,
      sec.iso ? `Las enkel de stalen schalen met puls-TIG op lage stroom, korte naden, laten afkoelen tussendoor: de isolatie mag niet smelten.` : `Las de zichtkant (voor) met TIG (ER70S-6 Ø1,6, 90-110 A), de binnenkant met MIG (G3Si1 Ø0,8). Beurtelings tegenover elkaar lassen.`,
      `Slijp de zichtkant vlak (korrel 80, daarna een fiberschijf 120) en breek de buitenhoek licht.`,
    );
    middelen.push(['TIG-staaf ER70S-6 Ø1,6', '–', 'ISO 636-A W3Si1'], ['MIG-draad G3Si1 Ø0,8, gas Ar/CO₂ 82/18', '–', 'ISO 14341-A'], ['Lasnaad', '4 hoeken per vleugel', 'kwaliteit ISO 5817-C']);
    return { id: 'hoek', titel: 'Hoek van de vleugel', sub: 'verstek 45°, gelast', delen, middelen, stappen, let: 'De lasnaden staan oranje; ze zijn enkel getekend als het samen is.' };
  }
  // aluminium: hoekverbinder in de holte, stelschroeven, lijm op het verstek
  const h = holte(sec, st), sp = 0.3, c0 = h.v0 + sp, c1 = h.v1 - sp, Lb = 60, zc0 = h.z0 + sp, zc1 = h.z1 - sp;
  const vb = o.sys.verbinders;
  delen.push({ naam: vb ? 'Hoekverbinder C1' : 'Hoekverbinder', label: vb ? 'C1, aluminium, 2 benen van 60 in de holte van P1' : `aluminium of zamak, 2 benen van ${Lb} in de koker`, kleur: KLEUR.verbinder, uit: [0, 0, 0],
    solids: [P('z', [[c0, c0], [Lb, c0], [Lb, c1], [c1, c1]], zc0, zc1), P('z', [[c0, c0], [c1, c1], [c1, Lb], [c0, Lb]], zc0, zc1)] });
  // stelschroeven: van de glaszijde (de wand naast de holte aan de glaskant), zo zijn de gaten na het glazen niet te zien
  const zm = D / 2, wg = h.v1 + (st?.wand ?? sec.t ?? 2), regel = [25, 48];
  delen.push({ naam: 'Stelschroef M6 x 8', label: 'inbus, ISO 4026; van de glaszijde door de boring Ø6,5', kleur: KLEUR.bout, uit: [0, 40, 0], solids: regel.map((x) => cil('y', x, zm, 3, c1 - 8, c1, 10)) });
  delen.push({ naam: 'Stelschroef M6 x 8 (stijl)', label: '', geenNr: true, kleur: KLEUR.bout, uit: [40, 0, 0], solids: regel.map((y) => cil('x', y, zm, 3, c1 - 8, c1, 10)) });
  for (const x of regel) {
    boor(delen, { as: 'y', cu: x, cv: zm, r: 3.25, van: wg, zin: -1, diep: wg - h.v1 + 0.2 }, (d) => d.naam === 'Onderregel van de vleugel');
    boor(delen, { as: 'x', cu: x, cv: zm, r: 3.25, van: wg, zin: -1, diep: wg - h.v1 + 0.2 }, (d) => d.naam === 'Stijl van de vleugel');
  }
  const gaten = [{ tekst: `Ø6,5 aan de glaszijde${o.sys.verbinders ? ' (in de gleufbodem)' : ''}: 2 per been, op 25 en 48 van de buitenhoek; na het glazen niet te zien`, p: [36.5, wg, zm], volg: 'Onderregel van de vleugel' }];
  delen.push({ naam: 'Lijm op het verstek', label: '2K-lijm of MS-kit op beide verstekvlakken', kleur: KLEUR.lijm, uit: [0, E, 0], alleenUit: true,
    solids: [P('z', [[0.4, -0.4], [K + 0.4, K - 0.4], [K - 0.4, K + 0.4], [-0.4, 0.4]], 0.3, D - 0.3)] });
  middelen.push([vb ? 'Hoekverbinder C1 (aanvraagdossier)' : 'Hoekverbinder voor koker 50x25x2 (holte 21 x 46: vraag een leverancier, Du Pont verkoopt hem niet)', '1 per hoek', vb ? 'aluminium, 2 x 60 mm' : 'aluminium/zamak'], ['Stelschroef M6 x 8, inbus, platte punt', '4 per hoek', 'ISO 4026, RVS A2'], ['2K-lijm of MS-polymeerkit', '–', 'op beide verstekvlakken']);
  stappen.push(
    `Zaag beide stukken in verstek 45° met een aluminiumblad (negatieve spaanhoek). Ontbraam, ontvet de verstekvlakken.`,
    `Boor aan de glaszijde${o.sys.verbinders ? ', in de gleufbodem,' : ''} 2 gaten Ø6,5 per been (op 25 en 48 mm van de buitenhoek, midden van de diepte): daar draai je de stelschroeven aan. Het glas dekt ze later af.`,
    `Steek de hoekverbinder ${vb ? 'C1 ' : ''}in de holte van het ene stuk, smeer lijm op beide verstekvlakken en schuif het andere stuk erover.`,
    `Druk de hoek dicht op de tafel tegen twee haakse aanslagen (lijmklem of hoekpers). Draai de 4 stelschroeven vast (± 5 Nm).`,
    `Veeg de uitgeperste lijm weg, meet de diagonalen van het kader (gelijk tot 1 mm) voor de lijm hard is.`,
  );
  return { id: 'hoek', titel: 'Hoek van de vleugel', sub: 'verstek 45° met hoekverbinder, geschroefd en gelijmd (niet lassen)', delen, gaten, middelen, stappen, let: 'Aluminium wordt niet gelast: de hoek houdt door de verbinder, de stelschroeven en de lijm.' };
}

/** roede stomp tegen de stijl (T) */
function roede(o) {
  const sk = sectie(o, 'kader'), sr = sectie(o, 'roede'), K = sk.V, D = sk.D, Hs = 220, yc = 110, Lr = 150, alu = !!o.sys.alu, kl = PROF(o);
  const zr = (D - sr.D) / 2, yr0 = yc - sr.V / 2, E = alu ? 70 : 30;
  const delen = [...profielDeel('Stijl van de vleugel', sk.naam, staaf(sk, Hs, 'y', {}), kl, [0, 0, 0])];
  const roedeWanden = staaf(sr, K + Lr, 'x', { y0: yr0, z0: zr, van: K });
  delen.push(...profielDeel(sr.lat ? 'Roede: kern' : 'Roede', sr.lat ? `${sr.naam} (kern), recht gezaagd` : `${sr.naam}, recht gezaagd op de daglichtmaat`, roedeWanden, kl, [E, 0, 0]));
  const middelen = [], stappen = [];
  if (sr.lat) {
    // eigen koker: kern platstaal met een lat 30x3 voor (gelast) en achter (geschroefd)
    const zk0 = zr, zk1 = zr + sr.D, lat = (z0, z1) => doos(K, K + Lr, yc - 15, yc + 15, z0, z1);
    delen.push({ naam: 'Lat voor 30x3', label: 'over het glas, gehecht om de 150 en gelast', kleur: kl, uit: [E, 0, -22], solids: [lat(zk0 - 3, zk0)] });
    delen.push({ naam: 'Lat achter 30x3', label: 'Ø4,5 geboord en 90° verzonken om de 250', kleur: kl, uit: [E, 0, 22], solids: [lat(zk1, zk1 + 3)] });
    delen.push({ naam: 'Schroef M4 x 12 verzonken', label: 'ISO 10642, RVS A2; in de kern getapt M4', kleur: KLEUR.bout, uit: [E, 0, 45], solids: verzonken('z', K + 75, yc, zk1 + 3, -1, 4, 12, 8) });
    boor(delen, { as: 'z', cu: K + 75, cv: yc, r: 2.25, R: 4.5, van: zk1 + 3, zin: -1, diep: 3 }, (d) => d.naam === 'Lat achter 30x3');
    boor(delen, { as: 'z', cu: K + 75, cv: yc, r: 1.65, van: zk1, zin: -1, diep: 8 }, (d) => d.naam === 'Roede: kern');
  }
  const gatenLat = sr.lat ? [{ tekst: 'lat achter Ø4,5 ⌵ Ø9 x 90°, kern M4 (boor Ø3,3), om de 250', p: [K + 75, yc, zr + sr.D + 3], volg: 'Lat achter 30x3' }] : [];
  if (!alu) {
    const r = 1.1, buiten = sr.lat ? [zr, zr + sr.D] : [zr, zr + sr.D];
    delen.push({ naam: 'Lasnaad', label: 'hoeklas a2 rondom de roede (TIG zichtkant), vlak slijpen', kleur: KLEUR.las, uit: [0, 0, 0], alleenSamen: true,
      solids: [cil('z', K + r * 0.6, yr0 - r * 0.6, r, buiten[0], buiten[1], 8), cil('z', K + r * 0.6, yr0 + sr.V + r * 0.6, r, buiten[0], buiten[1], 8), P('y', [[K, buiten[0] - r], [K + r * 1.4, buiten[0] - r], [K + r * 1.4, buiten[0]], [K, buiten[0]]], yr0, yr0 + sr.V), P('y', [[K, buiten[1]], [K + r * 1.4, buiten[1]], [K + r * 1.4, buiten[1] + r], [K, buiten[1] + r]], yr0, yr0 + sr.V)] });
    stappen.push(
      `Zaag de roede recht op de daglichtmaat${o.sys.koop ? ' en pas het uiteinde rond de sponning van het kader' : ''}.`,
      sr.lat ? `Leg de kern op afstandsblokjes zodat hij in het midden van de diepte ligt (het glas komt in het midden).` : `Leg de roede op dezelfde diepte als de sponning van het kader.`,
      `Hecht boven en onder, controleer haaks en in het midden; las rondom (hoeklas a2, TIG aan de zichtkant, kort en beurtelings), slijp vlak.`,
      ...(sr.lat ? [`Lat voor: hechten om de 150 en lassen. Lat achter: Ø4,5 boren en 90° verzinken om de 250, de kern M4 tappen; de lat gaat er pas op na het glazen.`] : []),
    );
    middelen.push(['Hoeklas a2 rondom', '2 per roede', 'ISO 5817-C'], ...(sr.lat ? [['Schroef M4 x 12 verzonken, RVS', 'om de 250', 'ISO 10642 A2']] : []));
    return { id: 'roede', titel: 'Roede tegen het kader', sub: 'stomp (T), gelast', delen, gaten: gatenLat, middelen, stappen, let: o.sys.iso ? 'Las enkel de stalen schalen; de isolatie niet verhitten.' : 'De lasnaad staat oranje en is enkel getekend als het samen is.' };
  }
  const vb = o.sys.verbinders;
  if (vb) {
    // P2: één RVS-schroef met bolkop door de gleufbodem van P1 in het schroefkanaal; toegang door een gat Ø10 in de buitenwand
    const kan = STAAF[o.sys.roede.staaf]?.gaten ?? [[15, 19.5], [15, 25.5]], y = yr0 + kan[0][0], z = zr + kan[0][1], web = [16.2, 18];
    delen.push({ naam: 'Schroef RVS 4,8 x 38 bolkop', label: 'ISO 7049 (kruiskop), door de gleufbodem van P1 in het schroefkanaal van P2', kleur: KLEUR.bout, uit: [-28, 0, 0], solids: [cil('x', y, z, 4.75, web[0] - 3.5, web[0], 16), cil('x', y, z, 2.4, web[0], web[0] + 38, 12)] });
    delen.push({ naam: 'Afdekdop Ø10', label: 'kunststof, kleur van het profiel, in het toegangsgat', kleur: KLEUR.rubber, uit: [-55, 0, 0], solids: [cil('x', y, z, 5, -1, 1.8, 16)] });
    boor(delen, { as: 'x', cu: y, cv: z, r: 5, van: 0, zin: 1, diep: 1.8 }, (d) => d.naam === 'Stijl van de vleugel');
    boor(delen, { as: 'x', cu: y, cv: z, r: 2.75, van: web[0], zin: 1, diep: web[1] - web[0] }, (d) => d.naam === 'Stijl van de vleugel');
    for (const [v2, z2] of kan) boor(delen, { as: 'x', cu: yr0 + v2, cv: zr + z2, r: 1.9, van: K, zin: 1, diep: Lr + 1 }, (d) => d.naam === 'Roede');
    const gaten = [{ tekst: 'Ø10 in de buitenwand van P1 (toegang, afdekdop), Ø5,5 in de gleufbodem', p: [0, y, z], volg: 'Stijl van de vleugel' }, { tekst: 'schroefkanalen Ø3,8 in P2 (in het profiel; 6 mm uit elkaar: plaats voor maar één kop)', p: [K + Lr, y, z], volg: 'Roede' }];
    middelen.push(['Schroef RVS 4,8 x 38 bolkop (kruiskop)', '1 per roede-uiteinde', 'ISO 7049 / DIN 7981, A2'], ['Afdekdop Ø10', '1 per roede-uiteinde', 'kunststof'], ['MS-kit in de naad', '–', 'kleur van het profiel']);
    stappen.push(
      `Zaag de roede P2 recht op de daglichtmaat (afkortzaag, aluminiumblad); ontbramen.`,
      `Teken op de stijl P1 de hartlijn van de roede af. Boor in de buitenwand een toegangsgat Ø10 en daarachter in de gleufbodem Ø5,5, op de hoogte van het eerste schroefkanaal van P2.`,
      `Zet de roede tegen de stijl (haaks) en draai door het toegangsgat een schroef 4,8 x 38 met bolkop door de gleufbodem in het schroefkanaal: de kop trekt tegen de gleufbodem, de buitenwand blijft vrij.`,
      `Druk de afdekdop Ø10 in het toegangsgat en kit de naad aan de zichtkant.`,
    );
    return { id: 'roede', kijk: { yaw: 34 }, titel: 'Roede tegen het kader', sub: 'stomp, één schroef met bolkop door een toegangsgat (afdekdop)', delen, gaten, middelen, stappen, let: 'Geen verzonken kop in een wand van 1,8 mm: de kop zou erdoor zakken. Daarom een toegangsgat met afdekdop.' };
  }
  // Du Pont: T-verbinder in de roede, cilinderkopbout M6 door de binnenwand van de stijl (toegang Ø13, afdekdop)
  const h = holte(sr, null), y0 = yr0 + h.v0 + 0.3, y1 = yr0 + h.v1 - 0.3, z0 = zr + h.z0 + 0.3, z1 = zr + h.z1 - 0.3, ym = (y0 + y1) / 2, zm = (z0 + z1) / 2, tw = sk.t || 2;
  delen.push({ naam: 'T-verbinder', label: 'aluminium blok in de koker, getapt M6, met stelschroef', kleur: KLEUR.verbinder, uit: [E * 0.45, 0, 0], solids: [doos(K + 0.2, K + 40, y0, y1, z0, z1)] });
  delen.push({ naam: 'Cilinderkopbout M6 x 30', label: 'ISO 4762 (inbus), RVS A2; klemt alleen de binnenwand van de stijl', kleur: KLEUR.bout, uit: [-30, 0, 0], solids: [cil('x', ym, zm, 5, K - tw - 6, K - tw, 16), cil('x', ym, zm, 3, K - tw, K - tw + 30, 12)] });
  delen.push({ naam: 'Afdekdop Ø13', label: 'kunststof, kleur van het profiel, in het toegangsgat', kleur: KLEUR.rubber, uit: [-55, 0, 0], solids: [cil('x', ym, zm, 6.5, -1, tw, 16)] });
  delen.push({ naam: 'Stelschroef M5 x 6', label: 'ISO 4026, van de glaszijde door de roede in de T-verbinder', kleur: KLEUR.bout, uit: [E * 0.45, 38, 0], solids: [cil('y', K + 20, zm, 2.5, y1 - 6, y1 + 2.5, 10)] });
  boor(delen, { as: 'x', cu: ym, cv: zm, r: 6.5, van: 0, zin: 1, diep: tw }, (d) => d.naam === 'Stijl van de vleugel');
  boor(delen, { as: 'x', cu: ym, cv: zm, r: 3.3, van: K - tw, zin: 1, diep: tw }, (d) => d.naam === 'Stijl van de vleugel');
  boor(delen, { as: 'x', cu: ym, cv: zm, r: 2.5, van: K + 0.2, zin: 1, diep: 26 }, (d) => d.naam === 'T-verbinder');
  boor(delen, { as: 'y', cu: K + 20, cv: zm, r: 2.75, van: yr0 + sr.V, zin: -1, diep: 2.6 }, (d) => d.naam === 'Roede');
  boor(delen, { as: 'y', cu: K + 20, cv: zm, r: 2.1, van: y1, zin: -1, diep: 7 }, (d) => d.naam === 'T-verbinder');
  const gaten = [{ tekst: 'Ø13 in de buitenwand (toegang, afdekdop), Ø6,6 in de binnenwand van de stijl', p: [0, ym, zm], volg: 'Stijl van de vleugel' }, { tekst: 'Ø5,5 aan de glaszijde van de roede (stelschroef M5)', p: [K + 20, yr0 + sr.V, zm], volg: 'Roede' }];
  middelen.push(['T-verbinder voor koker 50x25x2', '1 per roede-uiteinde', 'aluminium, getapt M6'], ['Cilinderkopbout M6 x 30, inbus', '1 per roede-uiteinde', 'ISO 4762, RVS A2'], ['Afdekdop Ø13', '1 per roede-uiteinde', 'kunststof'], ['Stelschroef M5 x 6', '1 per roede-uiteinde', 'ISO 4026, RVS A2'], ['MS-kit in de naad', '–', '']);
  stappen.push(
    `Zaag de roede recht op de daglichtmaat; ontbramen.`,
    `Schuif de T-verbinder in het uiteinde (vlak met de zaagsnede) en zet hem vast met de stelschroef M5, van de glaszijde.`,
    `Boor in de stijl een toegangsgat Ø13 in de buitenwand en Ø6,6 in de binnenwand, op de hartlijn van de roede.`,
    `Trek de roede tegen de stijl met de cilinderkopbout M6 x 30 door het toegangsgat (± 6 Nm): de kop klemt alleen de binnenwand, de koker wordt niet platgedrukt. Afdekdop erin, naad kitten.`,
  );
  return { id: 'roede', kijk: { yaw: 34 }, titel: 'Roede tegen het kader', sub: 'stomp, T-verbinder met een cilinderkopbout door de binnenwand', delen, gaten, middelen, stappen, let: 'Geen verzonken bout door een wand van 2 mm en niet door beide wanden: toegangsgat met afdekdop, de bout klemt de binnenwand.' };
}

/** het glas in het kader: doorsnede-stuk van de onderregel met het glas erboven */
function glas(o) {
  const sec = sectie(o, 'kader'), K = sec.V, D = sec.D, L = 160, gd = glasDikte(o), zc = D / 2, g0 = zc - gd / 2, g1 = zc + gd / 2, kl = PROF(o), alu = !!o.sys.alu;
  const delen = [...profielDeel('Onderregel van de vleugel', sec.naam, staaf(sec, L, 'x', {}), kl, [0, 0, 0])];
  const middelen = [], stappen = [], vb = o.sys.verbinders, gl = o.sys.glaslat.staaf;
  const ruit = (y0, uit) => ({ naam: o.opbouw === 'dubbel' ? 'Isolerend glas 44.2 | 14 | 6' : 'Veiligheidsglas', label: o.opbouw === 'dubbel' ? '44.2 | 14 | 6 gehard' : 'gelaagd 44.2 of gehard 8 mm', kleur: KLEUR.glas, alpha: 0.45, uit, solids: [doos(0, L, y0, K + 75, g0, g1)] });
  if (vb) {
    // P1 met gleuf: glas met U-rubber P4 in de gleuf geschoven
    const sl = STAAF.aanvraagP1.sleuf, yb = K - sl.diep, rub = sectie(o, 'glaslat');
    delen.push(ruit(yb + 1.8, [0, 55, 0]));
    delen.push({ naam: 'U-glasrubber P4', label: 'EPDM, rond de rand van elke ruit getrokken', kleur: KLEUR.rubber, uit: [0, 55, 0], solids: rub.wanden.map((w) => doos(0, L, yb + w.v0, yb + w.v1, sl.z0 + w.z0, sl.z0 + w.z1)) });
    middelen.push(['U-glasrubber P4, EPDM 70 Shore A', 'rondom elke ruit', 'op rol van 50 m'], ['Glasblokje 3 mm', '2 onder elke ruit', 'kunststof']);
    stappen.push(
      `Trek het U-rubber P4 rond de rand van de ruit; in de hoeken inknippen (V-snede), niet uitrekken.`,
      `Het glas gaat mee in het kader: schuif de ruiten in de gleuven van P1 en P2 voor je het laatste kaderstuk (bovenregel) monteert.`,
      `Zet de bovenregel met de hoekverbinders vast. Het rubber klemt het glas in de gleuf: geen glaslatten, geen kit nodig.`,
    );
    return { id: 'glas', titel: 'Glas in het kader', sub: 'in de gleuf, met U-rubber (geen glaslatten)', delen, middelen, stappen, let: `Inloop van het glas in de gleuf: ${o.sys.inloop ?? 10} mm. Bestel de ruiten op glasmaat (glaslijst).` };
  }
  const blokje = { naam: 'Glasblokje 3 mm', label: 'kunststof, 2 onder elke ruit', kleur: '#e7c35a', uit: [0, 28, 0], solids: [doos(30, 70, 0, 3, g0, g1), doos(L - 70, L - 30, 0, 3, g0, g1)] };
  if (alu) {
    // Du Pont: L-profielen voor en achter, voor gekit, achter met boorschroefjes
    const g = sectie(o, 'glaslat'), a = g.D, b = g.V, t = g.t || 2, ys = K;
    blokje.solids = blokje.solids.map((s) => ({ ...s, pts: s.pts.map(([x, y]) => [x, y + ys]) }));
    delen.push({ ...blokje }, ruit(ys + 3, [0, 55, 0]));
    const Lp = (zv, zin) => [doos(0, L, ys, ys + t, zin > 0 ? zv : zv - a, zin > 0 ? zv + a : zv), doos(0, L, ys, ys + b, zin > 0 ? zv : zv - t, zin > 0 ? zv + t : zv)];
    delen.push({ naam: 'L-profiel 20x10x2 voor', label: 'Du Pont 0709 L201020A, met kleefkit tegen de koker', kleur: kl, uit: [0, 0, -40], solids: Lp(g0, -1) });
    delen.push({ naam: 'L-profiel 20x10x2 achter', label: 'idem, met RVS-boorschroeven 3,5 x 13 om de 300', kleur: kl, uit: [0, 0, 40], solids: Lp(g1, 1) });
    delen.push({ naam: 'Boorschroef RVS 3,5 x 13 bolkop', label: 'DIN 7504-N, door het L-profiel in de koker (verzonken past niet in 2 mm)', kleur: KLEUR.bout, uit: [0, 35, 40], solids: [cil('y', 80, g1 + a / 2 + 1, 3.4, ys + t, ys + t + 2.6, 14), cil('y', 80, g1 + a / 2 + 1, 1.75, ys + t - 13, ys + t, 10)] });
    boor(delen, { as: 'y', cu: 80, cv: g1 + a / 2 + 1, r: 1.8, van: ys + t, zin: -1, diep: t }, (d) => d.naam === 'L-profiel 20x10x2 achter');
    boor(delen, { as: 'y', cu: 80, cv: g1 + a / 2 + 1, r: 1.4, van: ys, zin: -1, diep: 2.2 }, (d) => d.naam === 'Onderregel van de vleugel');
    var gatenG = [{ tekst: 'L-profiel Ø3,6 om de 300 (bolkop); de boorschroef boort de koker zelf', p: [80, ys + t, g1 + a / 2 + 1], volg: 'L-profiel 20x10x2 achter' }];
    middelen.push(['L-profiel 20x10x2 alu', 'voor en achter rond elke ruit', 'Du Pont 0709 L201020A'], ['Boorschroef RVS 3,5 x 13 met bolkop', 'om de 300 (achter)', 'DIN 7504-N, A2'], ['Kleefkit MS-polymeer', '–', 'voor de vaste L-profielen'], ['Glasblokje 3 mm', '2 onder elke ruit', 'kunststof']);
    stappen.push(
      `Zaag de L-profielen op maat per ruitzijde (de hoeken stomp of in verstek). Kit de voorste L-profielen tegen de binnenkant van het kader.`,
      `Leg 2 glasblokjes onder de ruit, zet het glas tegen de voorste L-profielen (transparante glaskit ertussen).`,
      `Zet de achterste L-profielen tegen het glas, boor ze voor Ø3,6 en schroef ze met boorschroeven 3,5 x 13 met bolkop om de 300 in de koker.`,
    );
    return { id: 'glas', titel: 'Glas in het kader', sub: 'tussen twee L-profielen: voor gekit, achter geschroefd', delen, gaten: gatenG, middelen, stappen, let: 'Het glas zit in het midden van de koker; de L-profielen zijn 2 mm dik en 10 mm breed over het glas.' };
  }
  if (o.sys.koop) {
    // koopprofiel met sponning: glas tegen de lip, glaslat achter op clips of tapeinden (klik)
    const sp = sec.sponning, yb = K - sp.b, g = sectie(o, 'glaslat'), gh = Math.min(g.V, sp.b + 4), gD = Math.max(4, D - g1 - 1.5);
    blokje.solids = blokje.solids.map((s) => ({ ...s, pts: s.pts.map(([x, y]) => [x, y + yb]) }));
    delen.push({ ...blokje }, ruit(yb + 3, [0, 55, 0]));
    const jansen = gl === 'jansen402', forster = gl === 'forster901227';
    delen.push({ naam: 'Glaslat (klik)', label: `${STAAF[gl]?.naam ?? gl}: klikt op de ${jansen ? 'tapeinden' : 'clips'}`, kleur: kl, uit: [0, 0, 45], solids: [doos(0, L, yb, yb + gh, g1 + 1.5, g1 + 1.5 + gD)] });
    delen.push({ naam: jansen ? 'Tapeinde 450.009' : forster ? 'Clip 906577' : 'Clip 450.026', label: jansen ? 'op de sponning gelast om de 300 (lasbout)' : 'in de sponning geklikt om de 250', kleur: KLEUR.verbinder, uit: [0, 0, 22],
      solids: jansen ? [cil('y', 50, g1 + 1.5 + gD / 2, 2, yb, yb + 8, 10), cil('y', 120, g1 + 1.5 + gD / 2, 2, yb, yb + 8, 10)] : [doos(44, 56, yb, yb + 5, g1 + 2, g1 + 1.5 + gD - 1), doos(114, 126, yb, yb + 5, g1 + 2, g1 + 1.5 + gD - 1)] });
    delen.push({ naam: 'Dichting', label: 'glasdichting uit het systeem (voor en achter het glas)', kleur: KLEUR.rubber, uit: [0, 0, -18], solids: [doos(0, L, yb + 3, yb + sp.b + 2, g0 - 2, g0)] });
    middelen.push([jansen ? 'Tapeinde (lasbout) 450.009' : forster ? 'Clip 906577' : 'Clip 450.026', jansen ? 'om de 300' : 'om de 250', jansen ? 'Jansen, op de sponning gelast' : forster ? 'Forster' : 'Jansen Janisol'], [STAAF[gl]?.naam ?? gl, 'rondom elke ruit', 'klikglaslat'], ['Dichtingen uit het systeem', 'rondom', forster ? 'Forster, droog beglazen' : 'Jansen 455.027-029 / 455.046'], ['Glasblokje 3 mm', '2 onder elke ruit', 'kunststof']);
    stappen.push(
      jansen ? `Las de tapeinden 450.009 met het lasboutpistool op de sponning, om de 300 mm, voor het coaten.` : `Klik de clips in de sponning, om de 250 mm (na het coaten).`,
      `Druk de dichting in de lip van het profiel. Leg 2 glasblokjes in de sponning en zet het glas tegen de dichting.`,
      `Klik de glaslat op de ${jansen ? 'tapeinden' : 'clips'}: begin in het midden, dan naar de hoeken. Druk de binnendichting tussen de glaslat en het glas.`,
    );
    return { id: 'glas', titel: 'Glas in het profiel', sub: 'in de sponning, met klikglaslat', delen, middelen, stappen, let: 'Geen schroeven door de glaslat: de lat klikt vast en is er weer af te nemen.' };
  }
  // eigen koker: lat 15x4 voor (gelast), hoeklijn 15x15x2 achter met M4 verzonken in de binnenwand van de koker
  const ys = K;
  blokje.solids = blokje.solids.map((s) => ({ ...s, pts: s.pts.map(([x, y]) => [x, y + ys]) }));
  delen.push({ ...blokje }, ruit(ys + 3, [0, 55, 0]));
  delen.push({ naam: 'Glaslat voor 15x4', label: 'platstaal, gehecht om de 150 en gelast (vast)', kleur: kl, uit: [0, 0, -30], solids: [doos(0, L, ys, ys + 15, g0 - 4, g0)] });
  delen.push({ naam: 'Lasnaad', label: 'hechtnaad 20 mm om de 150 (TIG)', kleur: KLEUR.las, uit: [0, 0, -30], alleenSamen: true, solids: [cil('x', ys + 0.6, g0 - 4.6, 0.9, 20, 40, 8), cil('x', ys + 0.6, g0 - 4.6, 0.9, 120, 140, 8)] });
  delen.push({ naam: 'Glaslat achter: hoeklijn 15x15x3', label: 'het ene been over het glas, het andere tegen de koker; 3 dik zodat de kop van M4 (2,5) vlak ligt', kleur: kl, uit: [0, 0, 40], solids: [doos(0, L, ys, ys + 15, g1, g1 + 3), doos(0, L, ys, ys + 3, g1 + 3, g1 + 15)] });
  delen.push({ naam: 'Vloeiboorkraag M4', label: 'vloeiboren Ø3,7 en rolltappen: ± 5 mm draad in de wand van 2 mm', kleur: KLEUR.plaat, uit: [0, 0, 0], solids: [cil('y', 80, g1 + 9, 3.1, ys - 2 - 3, ys - 2, 14)] });
  delen.push({ naam: 'Schroef M4 x 10 verzonken', label: 'ISO 10642, RVS A2, om de 250, in de vloeiboorkraag', kleur: KLEUR.bout, uit: [0, 35, 40], solids: verzonken('y', 80, g1 + 9, ys + 3, -1, 4, 10, 8) });
  boor(delen, { as: 'y', cu: 80, cv: g1 + 9, r: 2.25, R: 4.5, van: ys + 3, zin: -1, diep: 3 }, (d) => d.naam === 'Glaslat achter: hoeklijn 15x15x3');
  boor(delen, { as: 'y', cu: 80, cv: g1 + 9, r: 1.65, van: ys, zin: -1, diep: 5.2 }, (d) => d.naam === 'Onderregel van de vleugel' || d.naam === 'Vloeiboorkraag M4');
  const gatenK = [{ tekst: 'hoeklijn Ø4,5 ⌵ Ø9 x 90°; koker: vloeiboren Ø3,7, rolltappen M4; om de 250', p: [80, ys + 3, g1 + 9], volg: 'Glaslat achter: hoeklijn 15x15x3' }];
  delen.push({ naam: 'Kit', label: 'transparante glaskit tussen glas en lat', kleur: KLEUR.kit, uit: [0, 0, -15], solids: [doos(0, L, ys + 4, ys + 14, g0 - 0.8, g0)] });
  middelen.push(['Glaslat voor: platstaal 15x4', 'per ruitzijde', 'gelast'], ['Glaslat achter: hoeklijn 15x15x3', 'per ruitzijde', 'geschroefd'], ['Vloeiboor Ø3,7 + rolltap M4', 'gereedschap', 'of blindklinkmoer M4 met kleine kop'], ['Schroef M4 x 10 verzonken, inbus', 'om de 250', 'ISO 10642, RVS A2'], ['Glaskit transparant', '–', 'MS-polymeer'], ['Glasblokje 3 mm', '2 onder elke ruit', 'kunststof']);
  stappen.push(
    `Voor het coaten: hecht de glaslat voor (15x4) om de 150 en las ze vast. Boor de hoeklijnen achter Ø4,5 en verzink 90° tot Ø9 (om de 250). Vloeiboor de binnenwand van de koker Ø3,7 op dezelfde plaatsen en rolltap M4 (± 5 mm draad); stop de draad af voor het coaten.`,
    `Na het coaten: kit tegen de lat voor, leg 2 glasblokjes en zet het glas ertegen.`,
    `Zet de hoeklijn achter tegen het glas (been over het glas, been tegen de koker) en schroef hem met M4 x 10 verzonken vast.`,
  );
  return { id: 'glas', titel: 'Glas in het kader', sub: 'lat voor gelast, hoeklijn achter geschroefd', delen, gaten: gatenK, middelen, stappen, let: 'De schroeven zitten achter het glas in het been tegen de koker: aan de voorkant zie je geen schroeven.' };
}

/** de pivot onderaan: vloer, vloerpot, de deurplaat en hoe ze aan de onderregel vast zit */
function pivotOnder(o, k = {}) {
  const sec = sectie(o, 'kader'), K = sec.V, D = sec.D, alu = !!o.sys.alu, kl = PROF(o), ax = MATEN.taats, yv = MATEN.vloer ?? 10, zc = D / 2, L = 280;
  const sk = k.scharnierModel ?? k.scharnier ?? 'budget', sch = SCHARNIEREN[sk] ?? SCHARNIEREN.budget, fj = sk === 'premium';
  const delen = [
    { naam: 'Vloer', label: 'afgewerkte vloer', kleur: KLEUR.vloer, alpha: 0.5, uit: [0, 0, 0], geenNr: true, solids: [doos(-30, L + 20, -26, 0, -45, D + 45)] },
    ...profielDeel('Onderregel van de vleugel', sec.naam, staaf(sec, L, 'x', { y0: yv }), kl, [0, 100, 0]),
  ];
  const t = sec.t || 2, middelen = [], stappen = [];
  delen.push({ naam: fj ? 'FritsJurgens vloerplaat' : 'Vloerpot met as', label: fj ? 'vloerplaat met pen (System M+)' : `${sch.naam.replace(/^Pivot: /, '')}: pot in de vloer, as Ø20 op het hart`, kleur: KLEUR.pivot, uit: [0, 0, 0],
    solids: [cil('y', ax, zc, 22, -24, 0.6, 20), cil('y', ax, zc, 8, 0.6, yv - 2, 14)] });
  if (fj) {
    delen.push({ naam: 'FritsJurgens System M+', label: 'het scharnier zit in de onderregel (inbouw volgens de handleiding van FritsJurgens)', kleur: KLEUR.verbinder, uit: [0, 100, 0], solids: [doos(ax - 30, ax + 170, yv + t, yv + K - t, zc - 12, zc + 12)] });
    stappen.push(`Bestel System M+ (System One bij 60 diep) bij een FritsJurgens-partner en vraag de inbouwtekening op.`, `Zaag de uitsparing in de onderregel volgens die tekening, voor het lassen van het kader; het hart van de as komt op ${ax} mm van de scharnierkant.`, `Plaats de vloerplaat waterpas op het hart van de as; hang de deur en stel de demping en de stopstand in.`);
    middelen.push(['FritsJurgens System M+ (of One)', '1 per vleugel', 'met vloerplaat en bovenpen']);
    return { id: 'pivot', titel: 'Pivot onderaan', sub: 'FritsJurgens: in de deur ingebouwd', delen, middelen, stappen, let: `Hart van de as: ${ax} mm uit de scharnierkant, in het midden van de diepte. Exacte uitsparing: handleiding FritsJurgens.` };
  }
  const b1 = ax - 20, b2 = ax + 120;
  if (!alu) {
    delen.push({ naam: 'Taatsplaat onder 36x220x8', label: 'lasergesneden S235, M8 getapt; in de onderregel gelast', kleur: KLEUR.plaat, uit: [0, 100, 0], solids: [doos(ax - 60, ax + 160, yv + t, yv + t + 8, zc - 18 + 0.2, zc + 18 - 0.2)] });
  } else {
    delen.push({ naam: 'Inlegplaat 30x220x6', label: 'RVS of staal verzinkt, M6 getapt; in de koker geschoven', kleur: KLEUR.plaat, uit: [0, 100, 0], solids: [doos(ax - 60, ax + 160, yv + t, yv + t + 6, zc - 15, zc + 15)] });
  }
  const d = alu ? 6 : 8, kop = alu ? 12 : 16;
  delen.push({ naam: 'Deurplaat van de pivot', label: 'met de bus voor de as; tegen de onderkant van de regel', kleur: KLEUR.pivot, uit: [0, 60, 0], solids: [doos(ax - 30, ax + 150, yv - 6, yv - 0.1, zc - 14, zc + 14), cil('y', ax, zc, 13, yv - 6, yv - 0.1, 16)] });
  delen.push({ naam: `Bout M${d} x ${alu ? 16 : 20} verzonken`, label: `ISO 10642 (inbus, kop 90°), door de deurplaat en de onderwand in de ${alu ? 'inlegplaat' : 'taatsplaat'}`, kleur: KLEUR.bout, uit: [0, 28, 0],
    solids: [b1, b2].flatMap((x) => verzonken('y', x, zc, yv - 6, 1, d, alu ? 16 : 20, kop)) });
  for (const x of [b1, b2]) {
    boor(delen, { as: 'y', cu: x, cv: zc, r: alu ? 3.3 : 4.5, van: yv, zin: 1, diep: t }, (q) => q.naam === 'Onderregel van de vleugel');
    boor(delen, { as: 'y', cu: x, cv: zc, r: alu ? 2.5 : 3.4, van: yv + t, zin: 1, diep: alu ? 6 : 8 }, (q) => /^(Taatsplaat|Inlegplaat)/.test(q.naam));
    boor(delen, { as: 'y', cu: x, cv: zc, r: d / 2 + 0.3, R: kop / 2 + 0.3, van: yv - 6, zin: 1, diep: 6 }, (q) => q.naam === 'Deurplaat van de pivot');
  }
  boor(delen, { as: 'y', cu: ax, cv: zc, r: 8.6, van: yv - 6, zin: 1, diep: 4.5 }, (q) => q.naam === 'Deurplaat van de pivot');
  const gaten = [{ tekst: `onderwand Ø${alu ? '6,6' : '9'} (doorgang), ${alu ? 'inlegplaat M6 (boor Ø5)' : 'taatsplaat M8 (boor Ø6,8)'}`, p: [b2, yv, zc], volg: 'Onderregel van de vleugel' }, { tekst: `deurplaat: verzonken gaten (af fabriek) en de bus Ø17 voor de as`, p: [b1, yv - 6, zc], volg: 'Deurplaat van de pivot' }];
  middelen.push([sch.naam.replace(/^Pivot: /, ''), '1 per vleugel', `tot ${sch.maxKg} kg`], [alu ? 'Inlegplaat 30 x 220 x 6, M6 getapt' : 'Taatsplaat 36 x 220 x 8 (laser), M8 getapt', '1 per vleugel', alu ? 'RVS of staal verzinkt' : 'S235'], [`Bout M${d} x ${alu ? 16 : 20} verzonken, inbus`, '2 per vleugel', 'ISO 10642, 8.8 verzinkt of A2']);
  stappen.push(
    alu ? `Schuif de inlegplaat (M6 getapt op ${b1 - (ax - 60)} en ${b2 - (ax - 60)} mm) in de onderregel voor het kader dicht gaat; hart van de as op ${ax} mm van de scharnierkant.` : `Las de taatsplaat in de onderregel (tegen de onderwand) voor de hoeken dicht gaan; tap M8 op ${b1 - (ax - 60)} en ${b2 - (ax - 60)} mm van het einde. Hart van de as: ${ax} mm van de scharnierkant.`,
    `Boor de onderwand van de regel Ø${alu ? '6,6' : '9'} op dezelfde plaatsen (doorgang, niet verzinken): de verzonken gaten voor de boutkoppen zitten in de deurplaat.`,
    `Boor de vloerpot op het hart van de as (${ax} mm uit de scharnierkant van de opening, midden van de muur), waterpas zetten; ${yv} mm vrij onder de deur.`,
    `Zet de deurplaat met 2 verzonken bouten vast, plaats de deur op de as en zet de bovenpen (zie pivot boven).`,
  );
  return { id: 'pivot', titel: 'Pivot onderaan', sub: alu ? 'deurplaat geschroefd in een inlegplaat (aluminium)' : 'taatsplaat in de onderregel gelast, deurplaat geschroefd', delen, gaten, middelen, stappen, let: `Hart van de as: ${ax} mm uit de scharnierkant, midden van de diepte. Controleer de boorafstanden op de geleverde pivot.` };
}

/** de pivot bovenaan: de veerpen zit in de bovenregel van de deur en veert omhoog in een glijbus in het kozijn (zo zit
 *  er niets in de spleet van 4 mm); met een intrekgat aan de glaszijde om de pen in te drukken en de deur uit te nemen */
function pivotBoven(o, k = {}) {
  const sec = sectie(o, 'kader'), sz = sectie(o, 'kozijn'), K = sec.V, D = sec.D, alu = !!o.sys.alu, kl = PROF(o), ax = MATEN.taats, zc = D / 2, L = 280, sp = MATEN.speling;
  const sk = k.scharnierModel ?? k.scharnier ?? 'budget', fj = sk === 'premium';
  const t = sec.t || 2, tz = sz.t || 2, yk = K + sp, zk = (D - sz.D) / 2, zkc = zk + sz.D / 2, KZ = sz.V;
  const delen = [
    ...profielDeel('Bovenregel van de vleugel', sec.naam, staaf(sec, L, 'x', { spiegel: true }), kl, [0, 0, 0]),
    ...profielDeel('Bovenregel van het kozijn', sz.naam, staaf(sz, L + 40, 'x', { y0: yk, z0: zk, van: -40, spiegel: true }), kl, [0, 95, 0]),
  ];
  const hd = holte(sec, STAAF[o.sys.kader.staaf]), hk = holte(sz, STAAF[o.sys.kozijn.staaf]);
  // in de deur: de onderkant van de holte ligt op K - hd.v1 (gespiegeld), de bovenkant op K - hd.v0
  const d0 = K - hd.v1 + 0.2, d1 = K - hd.v0 - 0.2, k0 = yk + (KZ - hk.v1) + 0.2, k1 = yk + (KZ - hk.v0) - 0.2;
  if (alu) {
    delen.push({ naam: 'Pendrager deur', label: 'aluminium of POM 30 x 60, vult de holte; Ø20 voor de pen, zijdelings M6 voor de stelschroef', kleur: KLEUR.verbinder, uit: [0, 0, 0], solids: [doos(ax - 30, ax + 30, d0, d1, zc - 15, zc + 15)] });
    delen.push({ naam: 'Pendrager kozijn', label: 'idem, met de glijbus Ø19,2 (0,2 speling op de pen)', kleur: KLEUR.verbinder, uit: [0, 95, 0], solids: [doos(ax - 30, ax + 50, k0, k1, zkc - 15, zkc + 15)] });
    delen.push({ naam: 'Stelschroef M6 x 10', label: 'ISO 4026; zet de pendrager vast (deur: glaszijde, kozijn: muurkant)', kleur: KLEUR.bout, uit: [0, -30, 0], solids: [cil('y', ax - 22, zc, 3, d0 - 0.2, d0 + 9.8, 10)] });
  } else {
    delen.push({ naam: 'Taatsplaat boven 36x140x8', label: 'lasergesneden S235, Ø20 voor de pen; tegen de bovenwand gelast', kleur: KLEUR.plaat, uit: [0, 0, 0], solids: [doos(ax - 40, ax + 100, K - t - 8, K - t, zc - 17.8, zc + 17.8)] });
    delen.push({ naam: 'Lasring Ø30/Ø19,2 x 8', label: 'lasergesneden S235: de glijbus, binnen op de onderwand van de kozijnregel gelast', kleur: KLEUR.plaat, uit: [0, 95, 0], solids: [cil('y', ax, zkc, 15, yk + tz, yk + tz + 8, 28)] });
  }
  delen.push({ naam: fj ? 'Bovenpen FritsJurgens (in de deur)' : 'Bovenpen met veer (in de deur)', label: 'pen Ø19 met veerhuis; veert omhoog in de glijbus van het kozijn', kleur: KLEUR.pivot, uit: [0, 0, 0],
    solids: [cil('y', ax, zc, 12, d0 - 32, d0 - 0.01, 18), cil('y', ax, zc, 9.5, d0 - 0.01, yk + tz + 7, 16), doos(ax + 13, ax + 22, d0 - 26, d0 - 20, zc - 2, zc + 2)] });
  // de gaten
  const wDeur = (q) => q.naam === 'Bovenregel van de vleugel', wKoz = (q) => q.naam === 'Bovenregel van het kozijn';
  boor(delen, { as: 'y', cu: ax, cv: zc, r: 10, van: K, zin: -1, diep: K }, (q) => wDeur(q) || /^(Taatsplaat|Pendrager deur)/.test(q.naam));
  boor(delen, { as: 'y', cu: ax, cv: zkc, r: 10, van: yk, zin: 1, diep: tz }, wKoz);
  boor(delen, { as: 'y', cu: ax, cv: zkc, r: 9.6, van: yk + tz, zin: 1, diep: KZ }, (q) => /^(Lasring|Pendrager kozijn)/.test(q.naam));
  boor(delen, { as: 'z', cu: ax + 22, cv: d0 - 23, r: 4, van: 0, zin: 1, diep: t + 0.2 }, wDeur);
  if (alu) { boor(delen, { as: 'y', cu: ax - 22, cv: zc, r: 3.25, van: 0, zin: 1, diep: K - hd.v1 + 0.3 }, wDeur); boor(delen, { as: 'y', cu: ax - 22, cv: zc, r: 2.5, van: d0, zin: 1, diep: 10 }, (q) => q.naam === 'Pendrager deur'); }
  const gaten = [
    { tekst: `deur: Ø20 in de bovenwand${alu ? ' en de pendrager' : ' en de taatsplaat'}; Ø8 intrekgat${alu ? ', Ø6,5 voor de stelschroef' : ''} (glaszijde)`, p: [ax, K, zc], volg: 'Bovenregel van de vleugel' },
    { tekst: `kozijn: Ø20 in de onderwand, glijbus Ø19,2 ${alu ? 'in de pendrager' : 'in de lasring'}${alu ? '; Ø6,5 aan de muurkant voor de stelschroef' : ''}`, p: [ax, yk, zkc], volg: 'Bovenregel van het kozijn' },
  ];
  const middelen = [['Bovenpen met veer (bij de pivot)', '1 per vleugel', fj ? 'FritsJurgens' : 'pen Ø19, intrekbaar'], ...(alu ? [['Pendrager 30 x 60 (deur) en 30 x 80 (kozijn)', '1 + 1 per vleugel', 'aluminium of POM, Ø20 / Ø19,2, zijdelings M6'], ['Stelschroef M6 x 10', '2 per vleugel', 'ISO 4026, A2']] : [['Taatsplaat boven 36 x 140 x 8 (laser)', '1 per vleugel', 'S235'], ['Lasring Ø30 / Ø19,2 x 8 (laser, nadraaien)', '1 per vleugel', 'S235']])];
  const stappen = [
    alu ? `Deur: boor de bovenwand Ø20 op het hart van de as (${ax} mm van de scharnierkant), aan de glaszijde Ø8 (intrekgat) en Ø6,5 (stelschroef). Schuif de pendrager in de bovenregel voor de hoeken dicht gaan en zet hem vast met de stelschroef M6.` : `Deur: las de taatsplaat boven tegen de bovenwand, met de boring Ø20 op het hart van de as (${ax} mm van de scharnierkant); boor de bovenwand Ø20 mee en aan de glaszijde Ø8 (intrekgat).`,
    alu ? `Kozijn: boor de onderwand Ø20 recht boven de vloerpot (schietlood of laser) en Ø6,5 aan de muurkant. Schuif de pendrager kozijn (glijbus Ø19,2) in en zet hem vast.` : `Kozijn: boor de onderwand Ø20 recht boven de vloerpot (schietlood of laser) en las de lasring Ø30/Ø19,2 erboven, binnen in de regel. Ruim de ring na het coaten op Ø19,2.`,
    `Plaats de deur op de as onderaan, druk de pen in door het intrekgat en laat ze omhoog veren in de glijbus. Uitnemen: pen indrukken door het intrekgat. Spleet boven: ${sp} mm.`,
  ];
  return { id: 'pivotBoven', titel: 'Pivot bovenaan', sub: 'veerpen in de deur, glijbus in het kozijn, intrekgat', delen, gaten, middelen, stappen, let: 'Teken de pivot na volgens de fiche van de fabrikant; de as onder en de bus boven exact boven elkaar (± 1 mm).' };
}

/** verdekte scharnieren (staal): lasbak in de stijl en in het kozijn */
function verdekt(o, k = {}) {
  const sec = sectie(o, 'kader'), sz = sectie(o, 'kozijn'), K = sec.V, D = sec.D, kl = PROF(o), zwaar = (k.scharnierModel ?? '') === 'verdektZwaar';
  const H = 260, sp = 4, Kz = sz.V, bh = zwaar ? 240 : 170, bd = 32, by0 = (H - bh) / 2, zc = D / 2;
  const delen = [
    ...profielDeel('Scharnierstijl van de vleugel', sec.naam, staaf(sec, H, 'y', {}), kl, [35, 0, 0]),
    ...profielDeel('Stijl van het kozijn', sz.naam, staaf(sz, H, 'y', { x0: -sp - Kz }), kl, [-35, 0, 0]),
    { naam: 'Lasbak in de vleugel', label: 'RVS, in de uitsparing gelast (in lijn met de andere 2)', kleur: KLEUR.plaat, uit: [35, 0, 0], solids: [doos(1, 36, by0, by0 + bh, zc - bd / 2, zc + bd / 2)] },
    { naam: 'Lasbak in het kozijn', label: 'RVS, in de uitsparing gelast', kleur: KLEUR.plaat, uit: [-35, 0, 0], solids: [doos(-sp - 33, -sp - 1, by0, by0 + bh, zc - bd / 2, zc + bd / 2)] },
    { naam: zwaar ? 'Simonswerk Tectus TE 640 3D' : 'Argenta Invisible Neo L-7', label: 'het scharnier, in beide lasbakken geschroefd; 3D-afstelbaar', kleur: KLEUR.verbinder, uit: [0, 0, 60], solids: [doos(-sp - 28, 30, by0 + 20, by0 + bh - 20, zc - 11, zc + 11)] },
  ];
  return { id: 'pivot', titel: 'Verdekte scharnieren', sub: '3 per vleugel, lasbak in de stijl en in het kozijn', delen,
    middelen: [[zwaar ? 'Simonswerk Tectus TE 640 3D' : 'Argenta Invisible Neo L-7', '3 per vleugel', zwaar ? 'tot 250 kg' : 'tot 145 kg'], ['Lasbak RVS (bij het scharnier)', '2 per scharnier', `uitsparing ${bh} x ${bd}`]],
    stappen: [`Teken de uitsparingen af met de mal (${bh} x ${bd} mm): 250 onder de bovenkant, 250 boven de onderkant en in het midden.`, `Boor de hoeken, zaag uit, ontbraam. Las de lasbakken in met een richtlat door alle drie, zodat ze in één lijn staan.`, `Na het coaten: schroef de scharnieren in de lasbakken, hang de deur en stel af in 3 richtingen (spleet ${sp} mm).`],
    let: 'Enkel bij stalen deuren (het profiel is dan 60 breed). Aluminiumdeuren zijn altijd een pivot.' };
}

/** alle montagescènes van een deur, in de volgorde van het bouwen; k = keuzes (scharnierModel) */
export function montage(o, k = {}) {
  const sc = [hoek(o), roede(o), glas(o)];
  if (o.scharnier === 'verdekt') sc.push(verdekt(o, k));
  else sc.push(pivotOnder(o, k), pivotBoven(o, k));
  // nummers: elk deel dat geen nummer overslaat
  for (const s of sc) { let n = 0; for (const d of s.delen) if (!d.geenNr) d.nr = ++n; s.materiaal = o.sys.alu ? 'alu' : 'staal'; }
  return sc;
}
export const heeftRoeden = (o) => [...o.vleugels, ...o.vast].some((v) => v.delen.some((d) => d.soort === 'roede'));
