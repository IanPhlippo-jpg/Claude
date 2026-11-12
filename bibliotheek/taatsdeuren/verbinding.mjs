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
function staaf(sec, L, richting, { verstek = false, x0 = 0, y0 = 0, z0 = 0, van = 0 } = {}) {
  return sec.wanden.map((w) => {
    const [v0, v1] = [w.v0, w.v1];
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
const schroefGat = (as, cu, cv, a, r = 3.3) => cil(as, cu, cv, r, a - 0.12, a + 0.12);

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
  const sm = (c0 + c1) / 2, schroeven = [[25, sm], [48, sm], [sm, 25], [sm, 48]];
  delen.push({ naam: 'Stelschroef M6 x 8', label: 'inbus, ISO 4026; door de boring Ø6,5 in de achterwand', kleur: KLEUR.bout, uit: [0, 0, 40],
    solids: schroeven.map(([x, y]) => cil('z', x, y, 3, zc1 - 8, zc1, 10)) });
  delen.push({ naam: 'Boringen Ø6,5 in de achterwand', label: 'om de stelschroeven aan te draaien (2 per been)', kleur: KLEUR.gat, uit: [E, 0, 0], solids: schroeven.slice(0, 2).map(([x, y]) => schroefGat('z', x, y, D + 0.05, 3.25)) });
  delen.push({ naam: 'Boringen Ø6,5 (stijl)', label: '', kleur: KLEUR.gat, uit: [0, E, 0], geenNr: true, solids: schroeven.slice(2).map(([x, y]) => schroefGat('z', x, y, D + 0.05, 3.25)) });
  delen.push({ naam: 'Lijm op het verstek', label: '2K-lijm of MS-kit op beide verstekvlakken', kleur: KLEUR.lijm, uit: [0, E, 0], alleenUit: true,
    solids: [P('z', [[0.4, -0.4], [K + 0.4, K - 0.4], [K - 0.4, K + 0.4], [-0.4, 0.4]], 0.3, D - 0.3)] });
  middelen.push([vb ? 'Hoekverbinder C1 (aanvraagdossier)' : 'Hoekverbinder voor koker 50x25x2', '1 per hoek', vb ? 'aluminium, 2 x 60 mm' : 'aluminium/zamak'], ['Stelschroef M6 x 8, inbus, platte punt', '4 per hoek', 'ISO 4026, RVS A2'], ['2K-lijm of MS-polymeerkit', '–', 'op beide verstekvlakken']);
  stappen.push(
    `Zaag beide stukken in verstek 45° met een aluminiumblad (negatieve spaanhoek). Ontbraam, ontvet de verstekvlakken.`,
    `Boor in de achterwand 2 gaten Ø6,5 per been (op 25 en 48 mm van de buitenhoek, midden van de holte): daar draai je de stelschroeven aan.`,
    `Steek de hoekverbinder ${vb ? 'C1 ' : ''}in de holte van het ene stuk, smeer lijm op beide verstekvlakken en schuif het andere stuk erover.`,
    `Druk de hoek dicht op de tafel tegen twee haakse aanslagen (lijmklem of hoekpers). Draai de 4 stelschroeven vast (± 5 Nm).`,
    `Veeg de uitgeperste lijm weg, meet de diagonalen van het kader (gelijk tot 1 mm) voor de lijm hard is.`,
  );
  return { id: 'hoek', titel: 'Hoek van de vleugel', sub: 'verstek 45° met hoekverbinder, geschroefd en gelijmd (niet lassen)', delen, middelen, stappen, let: 'Aluminium wordt niet gelast: de hoek houdt door de verbinder, de stelschroeven en de lijm.' };
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
  }
  if (!alu) {
    const r = 1.1, buiten = sr.lat ? [zr, zr + sr.D] : [zr, zr + sr.D];
    delen.push({ naam: 'Lasnaad', label: 'hoeklas a3 rondom de roede (TIG zichtkant), vlak slijpen', kleur: KLEUR.las, uit: [0, 0, 0], alleenSamen: true,
      solids: [cil('z', K + r * 0.6, yr0 - r * 0.6, r, buiten[0], buiten[1], 8), cil('z', K + r * 0.6, yr0 + sr.V + r * 0.6, r, buiten[0], buiten[1], 8), P('y', [[K, buiten[0] - r], [K + r * 1.4, buiten[0] - r], [K + r * 1.4, buiten[0]], [K, buiten[0]]], yr0, yr0 + sr.V), P('y', [[K, buiten[1]], [K + r * 1.4, buiten[1]], [K + r * 1.4, buiten[1] + r], [K, buiten[1] + r]], yr0, yr0 + sr.V)] });
    stappen.push(
      `Zaag de roede recht op de daglichtmaat${o.sys.koop ? ' en pas het uiteinde rond de sponning van het kader' : ''}.`,
      sr.lat ? `Leg de kern op afstandsblokjes zodat hij in het midden van de diepte ligt (het glas komt in het midden).` : `Leg de roede op dezelfde diepte als de sponning van het kader.`,
      `Hecht boven en onder, controleer haaks en in het midden; las rondom (hoeklas a3, TIG aan de zichtkant), slijp vlak.`,
      ...(sr.lat ? [`Lat voor: hechten om de 150 en lassen. Lat achter: Ø4,5 boren en 90° verzinken om de 250, de kern M4 tappen; de lat gaat er pas op na het glazen.`] : []),
    );
    middelen.push(['Hoeklas a3 rondom', '2 per roede', 'ISO 5817-C'], ...(sr.lat ? [['Schroef M4 x 12 verzonken, RVS', 'om de 250', 'ISO 10642 A2']] : []));
    return { id: 'roede', titel: 'Roede tegen het kader', sub: 'stomp (T), gelast', delen, middelen, stappen, let: o.sys.iso ? 'Las enkel de stalen schalen; de isolatie niet verhitten.' : 'De lasnaad staat oranje en is enkel getekend als het samen is.' };
  }
  const vb = o.sys.verbinders;
  if (vb) {
    // P2 met 2 schroefkanalen: 2 RVS-schroeven door de stijl P1, verzonken in de buitenkant
    const gaten = (STAAF[o.sys.roede.staaf]?.gaten ?? [[15, 19.5], [15, 25.5]]).map(([v, z]) => [yr0 + v, zr + z]);
    delen.push({ naam: 'Schroef RVS 4,8 x 50 verzonken', label: 'ISO 7050 (kruiskop, kop 90°), in het schroefkanaal van P2', kleur: KLEUR.bout, uit: [-55, 0, 0], solids: gaten.flatMap(([y, z]) => verzonken('x', y, z, 0, 1, 4.8, 50, 9.5)) });
    delen.push({ naam: 'Boring Ø5,5, 90° verzonken tot Ø10', label: 'in de buitenkant van de stijl P1', kleur: KLEUR.gat, uit: [0, 0, 0], solids: gaten.map(([y, z]) => schroefGat('x', y, z, -0.05, 5)) });
    middelen.push(['Schroef RVS 4,8 x 50 verzonken (kruiskop)', '2 per roede-uiteinde', 'ISO 7050 / DIN 7982, A2'], ['MS-kit in de naad', '–', 'kleur van het profiel']);
    stappen.push(
      `Zaag de roede P2 recht op de daglichtmaat (afkortzaag, aluminiumblad); ontbramen.`,
      `Teken op de buitenkant van de stijl P1 de hartlijn van de roede af. Boor 2 gaten Ø5,5 op de plaats van de schroefkanalen en verzink ze 90° tot Ø10, zodat de kop vlak ligt.`,
      `Zet de roede tegen de stijl (haaks, het glas komt later in de gleuven) en draai de 2 schroeven 4,8 x 50 in de schroefkanalen van P2.`,
      `Kit de naad aan de zichtkant en werk de schroefkoppen bij met de lakstift.`,
    );
    return { id: 'roede', kijk: { yaw: 34 }, titel: 'Roede tegen het kader', sub: 'stomp, met 2 verzonken schroeven in het schroefkanaal', delen, middelen, stappen, let: 'De schroefkoppen liggen in de zijkant van de deur (de stijl), verzonken en vlak.' };
  }
  // Du Pont: T-verbinder in de roede, verzonken bout M6 door de stijl
  const h = holte(sr, null), y0 = yr0 + h.v0 + 0.3, y1 = yr0 + h.v1 - 0.3, z0 = zr + h.z0 + 0.3, z1 = zr + h.z1 - 0.3, ym = (y0 + y1) / 2, zm = (z0 + z1) / 2;
  delen.push({ naam: 'T-verbinder', label: 'aluminium blok in de koker, getapt M6, met stelschroef', kleur: KLEUR.verbinder, uit: [E * 0.45, 0, 0], solids: [doos(K + 0.2, K + 40, y0, y1, z0, z1)] });
  delen.push({ naam: 'Bout M6 x 40 verzonken', label: 'ISO 10642 (inbus, kop 90°), RVS A2, door de stijl in de T-verbinder', kleur: KLEUR.bout, uit: [-55, 0, 0], solids: verzonken('x', ym, zm, 0, 1, 6, 40, 12) });
  delen.push({ naam: 'Stelschroef M5 x 6', label: 'ISO 4026, van achter door de koker in de T-verbinder', kleur: KLEUR.bout, uit: [E * 0.45, 0, 38], solids: [cil('z', K + 20, ym, 2.5, z1 - 6, z1 + 2, 10)] });
  delen.push({ naam: 'Boring Ø6,6, 90° verzonken tot Ø13', label: 'in de buitenkant van de stijl', kleur: KLEUR.gat, uit: [0, 0, 0], solids: [schroefGat('x', ym, zm, -0.05, 6.5)] });
  middelen.push(['T-verbinder voor koker 50x25x2', '1 per roede-uiteinde', 'aluminium, getapt M6'], ['Bout M6 x 40 verzonken, inbus', '1 per roede-uiteinde', 'ISO 10642, RVS A2'], ['Stelschroef M5 x 6', '1 per roede-uiteinde', 'ISO 4026, RVS A2'], ['MS-kit in de naad', '–', '']);
  stappen.push(
    `Zaag de roede recht op de daglichtmaat; ontbramen.`,
    `Schuif de T-verbinder in het uiteinde (vlak met de zaagsnede) en zet hem vast met de stelschroef M5 van achter.`,
    `Boor de stijl Ø6,6 op de hartlijn van de roede en verzink de buitenkant 90° tot Ø13 (de kop ligt vlak).`,
    `Trek de roede tegen de stijl met de verzonken bout M6 x 40 (± 6 Nm); haaks houden. Kit de naad.`,
  );
  return { id: 'roede', kijk: { yaw: 34 }, titel: 'Roede tegen het kader', sub: 'stomp, met T-verbinder en verzonken bout M6', delen, middelen, stappen, let: 'Bout met afschuining (verzonken, kop 90°): de kop ligt vlak in de zijkant van de deur.' };
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
    delen.push({ naam: 'Boorschroef RVS 3,5 x 13 verzonken', label: 'DIN 7504-O, door het L-profiel in de koker', kleur: KLEUR.bout, uit: [0, 35, 40], solids: verzonken('y', 80, g1 + a / 2 + 1, ys + t, -1, 3.5, 13, 7) });
    middelen.push(['L-profiel 20x10x2 alu', 'voor en achter rond elke ruit', 'Du Pont 0709 L201020A'], ['Boorschroef RVS 3,5 x 13 verzonken', 'om de 300 (achter)', 'DIN 7504-O, A2'], ['Kleefkit MS-polymeer', '–', 'voor de vaste L-profielen'], ['Glasblokje 3 mm', '2 onder elke ruit', 'kunststof']);
    stappen.push(
      `Zaag de L-profielen op maat per ruitzijde (de hoeken stomp of in verstek). Kit de voorste L-profielen tegen de binnenkant van het kader.`,
      `Leg 2 glasblokjes onder de ruit, zet het glas tegen de voorste L-profielen (transparante glaskit ertussen).`,
      `Zet de achterste L-profielen tegen het glas en schroef ze met boorschroeven 3,5 x 13 (verzonken) om de 300 in de koker.`,
    );
    return { id: 'glas', titel: 'Glas in het kader', sub: 'tussen twee L-profielen: voor gekit, achter geschroefd', delen, middelen, stappen, let: 'Het glas zit in het midden van de koker; de L-profielen zijn 2 mm dik en 10 mm breed over het glas.' };
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
  delen.push({ naam: 'Glaslat achter: hoeklijn 15x15x2', label: 'het ene been over het glas, het andere tegen de koker', kleur: kl, uit: [0, 0, 40], solids: [doos(0, L, ys, ys + 15, g1, g1 + 2), doos(0, L, ys, ys + 2, g1 + 2, g1 + 15)] });
  delen.push({ naam: 'Schroef M4 x 10 verzonken', label: 'ISO 10642, RVS A2, om de 250; binnenwand van de koker getapt M4', kleur: KLEUR.bout, uit: [0, 35, 40], solids: verzonken('y', 80, g1 + 9, ys + 2, -1, 4, 10, 8) });
  delen.push({ naam: 'Kit', label: 'transparante glaskit tussen glas en lat', kleur: KLEUR.kit, uit: [0, 0, -15], solids: [doos(0, L, ys + 4, ys + 14, g0 - 0.8, g0)] });
  middelen.push(['Glaslat voor: platstaal 15x4', 'per ruitzijde', 'gelast'], ['Glaslat achter: hoeklijn 15x15x2', 'per ruitzijde', 'geschroefd'], ['Schroef M4 x 10 verzonken, inbus', 'om de 250', 'ISO 10642, RVS A2'], ['Glaskit transparant', '–', 'MS-polymeer'], ['Glasblokje 3 mm', '2 onder elke ruit', 'kunststof']);
  stappen.push(
    `Voor het coaten: hecht de glaslat voor (15x4) om de 150 en las ze vast. Boor de hoeklijnen achter Ø4,5 en verzink 90° tot Ø9 (om de 250); tap de binnenwand van de koker M4 op dezelfde plaatsen.`,
    `Na het coaten: kit tegen de lat voor, leg 2 glasblokjes en zet het glas ertegen.`,
    `Zet de hoeklijn achter tegen het glas (been over het glas, been tegen de koker) en schroef hem met M4 x 10 verzonken vast.`,
  );
  return { id: 'glas', titel: 'Glas in het kader', sub: 'lat voor gelast, hoeklijn achter geschroefd', delen, middelen, stappen, let: 'De schroeven zitten achter het glas in het been tegen de koker: aan de voorkant zie je geen schroeven.' };
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
  middelen.push([sch.naam.replace(/^Pivot: /, ''), '1 per vleugel', `tot ${sch.maxKg} kg`], [alu ? 'Inlegplaat 30 x 220 x 6, M6 getapt' : 'Taatsplaat 36 x 220 x 8 (laser), M8 getapt', '1 onder + 1 boven', alu ? 'RVS of staal verzinkt' : 'S235'], [`Bout M${d} x ${alu ? 16 : 20} verzonken, inbus`, '2 per plaat', 'ISO 10642, 8.8 verzinkt of A2']);
  stappen.push(
    alu ? `Schuif de inlegplaat (M6 getapt op ${b1 - (ax - 60)} en ${b2 - (ax - 60)} mm) in de onderregel voor het kader dicht gaat; hart van de as op ${ax} mm van de scharnierkant.` : `Las de taatsplaat in de onderregel (tegen de onderwand) voor de hoeken dicht gaan; tap M8 op ${b1 - (ax - 60)} en ${b2 - (ax - 60)} mm van het einde. Hart van de as: ${ax} mm van de scharnierkant.`,
    `Boor de onderwand van de regel Ø${alu ? '6,6' : '9'} op dezelfde plaatsen en verzink 90° tot Ø${kop + 1}: de boutkoppen liggen vlak in de deurplaat.`,
    `Boor de vloerpot op het hart van de as (${ax} mm uit de scharnierkant van de opening, midden van de muur), waterpas zetten; ${yv} mm vrij onder de deur.`,
    `Zet de deurplaat met 2 verzonken bouten vast, plaats de deur op de as en zet de bovenpen (zie pivot boven).`,
  );
  return { id: 'pivot', titel: 'Pivot onderaan', sub: alu ? 'deurplaat geschroefd in een inlegplaat (aluminium)' : 'taatsplaat in de onderregel gelast, deurplaat geschroefd', delen, middelen, stappen, let: `Hart van de as: ${ax} mm uit de scharnierkant, midden van de diepte. Controleer de boorafstanden op de geleverde pivot.` };
}

/** de pivot bovenaan: bovenregel van de deur, bovenregel van het kozijn, de bovenpen */
function pivotBoven(o, k = {}) {
  const sec = sectie(o, 'kader'), sz = sectie(o, 'kozijn'), K = sec.V, D = sec.D, alu = !!o.sys.alu, kl = PROF(o), ax = MATEN.taats, zc = D / 2, L = 280, sp = 4;
  const sk = k.scharnierModel ?? k.scharnier ?? 'budget', fj = sk === 'premium';
  const yk = K + sp, zk = (D - sz.D) / 2, t = sec.t || 2;
  const delen = [
    ...profielDeel('Bovenregel van de vleugel', sec.naam, staaf(sec, L, 'x', {}), kl, [0, 0, 0]),
    ...profielDeel('Bovenregel van het kozijn', sz.naam, staaf(sz, L + 40, 'x', { y0: yk, z0: zk, van: -40 }), kl, [0, 85, 0]),
  ];
  if (!alu) delen.push({ naam: 'Taatsplaat boven 36x140x8', label: 'lasergesneden S235, boring Ø20; in de bovenregel gelast', kleur: KLEUR.plaat, uit: [0, 0, 0], solids: [doos(ax - 40, ax + 100, K - t - 8, K - t, zc - 18 + 0.2, zc + 18 - 0.2)] });
  else delen.push({ naam: 'Inlegplaat boven 30x140x6', label: 'RVS, boring Ø20; in de koker geschoven en met 2 bouten M6 vast', kleur: KLEUR.plaat, uit: [0, 0, 0], solids: [doos(ax - 40, ax + 100, K - t - 6, K - t, zc - 15, zc + 15)] });
  delen.push({ naam: fj ? 'Bovenpen FritsJurgens' : 'Bovenpen met veer', label: 'in een uitsparing in de onderwand van het kozijn; de pen veert in de bus van de deur', kleur: KLEUR.pivot, uit: [0, 55, 0], solids: [doos(ax - 25, ax + 25, yk + 0.1, yk + 6, zc - 14, zc + 14), cil('y', ax, zc, 9, K - t - 8, yk + 0.1, 14)] });
  delen.push({ naam: 'Schroef M5 x 12 verzonken', label: 'ISO 10642, van onder door de bovenpen in het kozijn (getapt M5)', kleur: KLEUR.bout, uit: [0, 25, 0], solids: [ax - 16, ax + 16].flatMap((x) => verzonken('y', x, zc + 9, yk, 1, 5, 12, 10)) });
  const middelen = [['Bovenpen (bij de pivot)', '1 per vleugel', fj ? 'FritsJurgens' : 'met veer, pen Ø18'], ['Schroef M5 x 12 verzonken', '2 per bovenpen', 'ISO 10642, A2'], [alu ? 'Inlegplaat boven 30 x 140 x 6, boring Ø20' : 'Taatsplaat boven 36 x 140 x 8, boring Ø20', '1 per vleugel', alu ? 'RVS' : 'S235, laser']];
  const stappen = [
    alu ? `Schuif de inlegplaat boven in de bovenregel; boring Ø20 op het hart van de as (${ax} mm van de scharnierkant), vast met 2 verzonken bouten M6 door de bovenwand.` : `Las de taatsplaat boven in de bovenregel (tegen de bovenwand) met de boring Ø20 op het hart van de as (${ax} mm van de scharnierkant). Boor de bovenwand Ø20 mee.`,
    `Boor en tap de bovenregel van het kozijn M5 voor de bovenpen, recht boven de vloerpot (schietlood of laser).`,
    `Druk de pen in, zet de deur op de as onderaan, laat de pen in de bus van de deur veren. Spleet boven: ${sp} mm.`,
  ];
  return { id: 'pivotBoven', titel: 'Pivot bovenaan', sub: 'bovenpen in het kozijn, bus in de deur', delen, middelen, stappen, let: 'De as onder en de pen boven moeten exact boven elkaar staan (± 1 mm), anders loopt de deur niet vrij.' };
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
