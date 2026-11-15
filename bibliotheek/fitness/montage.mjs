// Montage per verbinding van een fitnesstoestel: voor elke boutverbinding, pen of anker een kleine 3D-scène van de
// stukken rond die plaats (uit elkaar en samen), getekend met tekenScène van de taatsdeuren (A4-blad) en in 3D met
// verbinding3d.mjs (werkplaatspagina). Scène: x rechts, y omhoog, z naar de kijker; prisma's zoals verbinding.mjs.
// Node en browser.
import { tekenScène } from '../taatsdeuren/montage.mjs';
import { KLEUR } from '../taatsdeuren/verbinding.mjs';
import { KOOP } from './onderdelen.mjs';
import { hoeken, aabb } from './model.mjs';
import { svg, A4L, tk, lijn, titelblok, rij, naamVan, f } from './blad.mjs';

const KL = { frame: KLEUR.staal, leer: '#3b3e42', hout: '#c8a878', zink: KLEUR.bout, rubber: KLEUR.rubber, chroom: '#c5ccd3', uhmw: '#eeeeee', katrol: '#41454a', stapel: '#5b6168', kap: '#9aa5b1', kabel: '#202020' };
const AS = { 0: 'x', 2: 'y', 1: 'z' };
/** model -> scène (rond het punt p) */
const S = (q, p) => [q[0] - p[0], q[2] - p[2], -(q[1] - p[1])];
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const asRecht = (g) => [g.u, g.v].every((d) => Math.max(...d.map(Math.abs)) > 0.9999);
/** een balk als prisma, afgeknipt tot de doos rond p (straal R); null als hij erbuiten valt of schuin staat */
function prisma(g, p, R) {
  if (!asRecht(g)) return null;
  const [mn, mx] = aabb(g);
  if ([0, 1, 2].some((i) => mx[i] < p[i] - R || mn[i] > p[i] + R)) return null;
  const i = [0, 1, 2].reduce((m, j) => (Math.abs(g.u[j]) > Math.abs(g.u[m]) ? j : m), 0), as = AS[i];
  const h = hoeken(g), n = h.length / 2, sect = h.slice(0, n).map((q) => S(q, p));
  const a = Math.max(Math.min(g.a[i], g.b[i]), p[i] - R), b = Math.min(Math.max(g.a[i], g.b[i]), p[i] + R);
  let a0, a1; if (i === 1) { a0 = -(b - p[1]); a1 = -(a - p[1]); } else { a0 = a - p[i]; a1 = b - p[i]; }
  const pts = sect.map((q) => (as === 'z' ? [q[0], q[1]] : as === 'x' ? [q[1], q[2]] : [q[0], q[2]]));
  return { as, pts, a0, a1 };
}

/** alle verbindingen van een toestel als scènes */
export function montage(o) {
  const R = 230, sc = [], gezien = new Set();
  const verbindingen = [
    ...o.bouten.map((b) => ({ soort: b.key === 'anker' ? 'anker' : 'bout', naam: b.naam, a: b.a, b: b.b, p: b.p, uit: b.uit, n: b.n, key: b.key, koop: b.koop })),
    ...o.pennen.filter((p) => p.a && p.b).map((p) => ({ soort: 'pen', naam: p.naam, a: p.a, b: p.b, p: p.p, uit: p.uit ?? [0, 0, 120], d: p.d, key: p.key })),
  ];
  for (const v of verbindingen) {
    const sleutel = `${v.soort}|${v.naam.replace(/ [LR]$|( (L|R|links|rechts|onder|boven))+$/g, '')}`;
    if (gezien.has(sleutel)) continue; gezien.add(sleutel);
    const delen = [], uitB = S([v.uit[0] + v.p[0], v.uit[1] + v.p[1], v.uit[2] + v.p[2]], v.p);
    let nr = 0;
    const voeg = (naam, label, kleur, solids, uit = [0, 0, 0], extra = {}) => { if (solids.length) delen.push({ naam, nr: extra.geenNr ? undefined : ++nr, label, kleur, solids, uit, ...extra }); };
    for (const d of o.delen) {
      if (d.groep !== v.a && d.groep !== v.b) continue;
      const s = d.geo.map((g) => prisma(g, v.p, R)).filter(Boolean);
      voeg(d.naam, d.soort === 'staaf' ? d.P.naam : `plaat ${d.t} mm`, KL[d.kleur ?? 'frame'] ?? KL.frame, s, d.groep === v.b ? uitB : [0, 0, 0]);
    }
    for (const k of o.kussens) if (k.groep === v.a || k.groep === v.b) voeg(k.naam, 'kussen', KL.leer, k.geo.map((g) => prisma(g, v.p, R)).filter(Boolean), k.groep === v.b ? uitB : [0, 0, 0]);
    // de bout(en) of de pen
    const vast = v.koop?.geo ?? o.koop.find((k) => k.naam.endsWith(v.naam) && k.geo.length)?.geo ?? [];
    const bs = vast.map((g) => prisma(g, v.p, R)).filter(Boolean);
    if (bs.length) voeg(v.key ? KOOP[v.key].naam : `Pen Ø${v.d}`, v.soort === 'anker' ? 'in het boorgat' : v.soort === 'bout' ? 'met 2 ringen en borgmoer' : 'met borging', KL.zink, bs, uitB.map((x) => x * 1.7));
    if (v.soort === 'anker') {
      const muur = v.a === 'muur';
      voeg(muur ? 'Muur (beton of volle baksteen)' : 'Vloer (beton)', '', '#cfcac0', [muur ? { as: 'z', pts: [[-R, -R], [R, -R], [R, R], [-R, R]], a0: -180, a1: 0 } : { as: 'y', pts: [[-R, -R], [R, -R], [R, R], [-R, R]], a0: -150, a1: 0 }], [0, 0, 0], { geenNr: true });
    }
    if (delen.filter((d) => d.nr).length < 2) continue;
    const middelen = v.soort === 'pen' ? [[v.key ? KOOP[v.key].naam : `gelaste pen Ø${v.d} (S235)`, '1', 'EN ISO 20957-2: borging tegen loskomen']] : v.soort === 'anker' ? [[KOOP.anker.naam, String(v.n), 'ETA-05/0069 (FAZ II)']] : [[KOOP[v.key].naam, String(v.n), 'ISO 4014/4017, ISO 7040, ISO 7089']];
    const stappen = v.soort === 'anker'
      ? [`Zet het toestel op zijn plaats en teken de ${v.n} gaten af.`, 'Boor Ø12 x 110 in beton (hamerboor), blaas en borstel het gat uit.', 'Klop de keilbouten erin en haal ze aan met 50 Nm (FAZ II 12, AANNAME: zie de ETA).']
      : v.soort === 'bout'
        ? ['Zet het stuk met de flens tegen het vlak; de gaten moeten in lijn liggen.', `Steek ${v.n} x ${KOOP[v.key].naam.split(' 8.8')[0].replace('Bout ', '')} met een ring door, ring en borgmoer aan de andere kant.`, `Haal aan met ${KOOP[v.key].M === 16 ? '200' : KOOP[v.key].M === 12 ? '80' : '45'} Nm (8.8, AANNAME) en kijk de haaksheid na.`]
        : ['Zet de stukken tegen elkaar met de gaten in lijn.', `Steek de pen Ø${v.d} er helemaal door${v.key ? ' tot de veer of de kogels vastklikken' : ''}.`, 'Trek eraan: de pen mag niet vanzelf loskomen.'];
    sc.push({ id: `m${sc.length + 1}`, titel: v.naam, sub: v.soort === 'anker' ? 'verankering' : v.soort === 'bout' ? 'boutverbinding' : 'pen', delen, middelen, stappen, kijk: { yaw: -35, pitch: 24 }, soort: v.soort });
    if (sc.length >= 8) break;
  }
  // katrol in zijn beugel (de eerste twee soorten katrollen)
  const kGezien = new Set();
  for (const kt of o.katrollen) {
    if (kGezien.has(kt.key) || kGezien.size >= 2 || sc.length >= 9) continue;
    const R = 140, delen = []; let nr = 0;
    for (const d of o.delen) {
      const s = d.geo.map((g) => prisma(g, kt.c, R)).filter(Boolean); if (!s.length) continue;
      const eigen = d.naam.endsWith(kt.label);
      delen.push({ naam: d.naam, nr: eigen ? ++nr : undefined, label: d.soort === 'staaf' ? d.P.naam : `plaat ${d.t} mm`, kleur: KL[d.kleur ?? 'frame'] ?? KL.frame, solids: s, uit: [0, 0, 0] });
    }
    const ax = S([kt.as[0] + kt.c[0], kt.as[1] + kt.c[1], kt.as[2] + kt.c[2]], kt.c), wiel = prisma(kt.geo[0], kt.c, R), as = prisma(kt.geo[1], kt.c, R);
    if (!wiel || !as) continue;
    kGezien.add(kt.key);
    delen.push({ naam: KOOP[kt.key].naam, nr: ++nr, label: 'met kogellager', kleur: KL.katrol, solids: [wiel], uit: [0, -170, 0] }, { naam: 'Bout M10 x 60 8.8 + borgmoer', nr: ++nr, label: 'as van de katrol', kleur: KL.zink, solids: [as], uit: ax.map((x) => x * 160) });
    sc.push({ id: `m${sc.length + 1}`, titel: `Katrol ${kt.label}`, sub: 'katrol in de beugel', delen, middelen: [[KOOP[kt.key].naam, '1', KOOP[kt.key].winkel], ['Bout M10 x 60 8.8 + borgmoer', '1', 'ISO 4014, ISO 7040']], stappen: ['Leg de katrol tussen de beugelplaten; de groef in lijn met de kabel.', 'Steek de bout M10 door de beugel en de katrol, borgmoer erop (vast, de katrol moet vrij draaien).', `Kijk na: tussen de beugel en de groef ≤ 5 mm, zodat de kabel er niet uit kan${kt.c[2] < 1800 ? '; vingerbescherming terug op zijn plaats' : ''}.`], kijk: { yaw: -40, pitch: 22 }, soort: 'pen' });
  }
  // kussen op het frame (het eerste kussen dat recht ligt)
  for (const k of o.kussens) {
    if (sc.length >= 10) break;
    const p = [(k.a[0] + k.b[0]) / 2, (k.a[1] + k.b[1]) / 2, (k.a[2] + k.b[2]) / 2], R = 230, kg = prisma(k.geo[0], p, R);
    if (!kg) continue;
    const delen = []; let nr = 0;
    for (const d of o.delen) { const s = d.geo.map((g) => prisma(g, p, R)).filter(Boolean); if (s.length) delen.push({ naam: d.naam, nr: ++nr, label: d.soort === 'staaf' ? d.P.naam : `plaat ${d.t} mm`, kleur: KL[d.kleur ?? 'frame'] ?? KL.frame, solids: s, uit: [0, 0, 0] }); }
    const n = S(add3(k.n, p), p);
    delen.push({ naam: k.naam, nr: ++nr, label: `multiplex 18 + schuim ${k.schuim} + kunstleer`, kleur: KL.leer, solids: [kg], uit: n.map((x) => x * 180) });
    sc.push({ id: `m${sc.length + 1}`, titel: `${k.naam} op het frame`, sub: 'kussen', delen, middelen: [['Bout M8 x 30 met ring', String(k.inslag ?? 4), 'ISO 4017'], ['Inslagmoer M8 in de multiplex', String(k.inslag ?? 4), '']], stappen: ['Leg het kussen met de multiplex op de kussenplaten; de inslagmoeren boven de gaten.', `Draai ${k.inslag ?? 4} bouten M8 x 30 met een ring van onder door de kussenplaat in de inslagmoeren.`, 'Niet te vast (de multiplex mag niet scheuren); kijk na dat het kussen niet wiebelt.'], kijk: { yaw: -35, pitch: 28 }, soort: 'bout' });
    break;
  }
  return sc;
}

const W4 = 297, H4 = 210;
const T = (x, y, t, h = 2.5, o2 = {}) => tk(x, y, t, h, o2);
/** één montageblad A4 liggend */
export function montageBlad(o, sc, meta = {}) {
  const el = [], kl = { pen: '#0f766e', bout: '#c2410c', anker: '#59626a' }[sc.soort] ?? '#c2410c', lab = { pen: 'PEN', bout: 'BOUT', anker: 'ANKER' }[sc.soort] ?? 'MONTAGE';
  el.push(`<rect x="24" y="14" width="${lab.length * 2.6 + 6}" height="7" fill="${kl}"/>`, T(27, 19.2, lab, 3.4, { vet: true, kleur: '#fff' }));
  el.push(T(lab.length * 2.6 + 34, 19.3, `Montage ${meta.i ?? ''}: ${sc.titel}`, 4.2, { vet: true }), T(24, 26, `${sc.sub} · ${naamVan(o)} · ${o.V.naam.toLowerCase()}`, 2.6, { kleur: '#333' }));
  const vak = [30, 32, 140, 120], groot = tekenScène(sc, { t: 1, vak, ...(sc.kijk ?? {}) });
  el.push(groot.svg);
  // ballonnen links van het vak
  const ank = [...groot.ankers].sort((a, b) => a.y - b.y);
  ank.forEach((a, i) => { const by = 40 + i * 9; el.push(lijn(26, by, a.x, a.y, 0.2), `<circle cx="${f(a.x)}" cy="${f(a.y)}" r="0.6" fill="#111"/>`, `<circle cx="26" cy="${f(by)}" r="2.8" fill="#fff" stroke="#111" stroke-width="0.3"/>`, T(26, by + 1.1, String(a.nr), 3, { anker: 'middle', vet: true })); });
  el.push(T(vak[0] + vak[2] / 2, 158, 'Uit elkaar (zonder schaal)', 2.4, { anker: 'middle', kleur: '#555' }));
  const klein = tekenScène(sc, { t: 0, vak: [190, 30, 92, 50], nummers: false, ...(sc.kijk ?? {}) });
  el.push(`<rect x="186" y="28" width="100" height="58" fill="#f6f7f8" stroke="#bbb" stroke-width="0.2"/>`, klein.svg, T(236, 84, 'Samen', 2.4, { anker: 'middle', kleur: '#555' }));
  let y = 93; el.push(T(186, y, 'Onderdelen', 2.9, { vet: true })); y += 3.6;
  for (const d of sc.delen.filter((x) => x.nr)) { if (y > 132) break; el.push(`<circle cx="188.4" cy="${f(y - 0.9)}" r="2.1" fill="#fff" stroke="#111" stroke-width="0.25"/>`, T(188.4, y, String(d.nr), 2.1, { anker: 'middle', vet: true }), `<rect x="191.6" y="${f(y - 2.4)}" width="2.6" height="2.6" fill="${d.kleur}" stroke="#555" stroke-width="0.12"/>`, T(195.6, y, `${d.naam}${d.label ? `: ${d.label}` : ''}`.slice(0, 62), 2.05)); y += 3.4; }
  y += 2; el.push(T(186, y, 'Bevestiging en norm', 2.9, { vet: true })); y += 3.4;
  for (const [wat, n, nm] of sc.middelen) for (const [i, t] of rij(`${wat} · ${n}${nm ? ` · ${nm}` : ''}`, 64).entries()) { el.push(T(186, y, `${i ? '  ' : '• '}${t}`, 2.05)); y += 2.7; }
  let ys = 165; el.push(T(24, ys, 'Zo bouw je het', 2.9, { vet: true })); ys += 3.6;
  sc.stappen.forEach((s, i) => { rij(s, 92).forEach((t, j) => { if (ys < 196) el.push(T(j ? 28 : 24, ys, `${j ? '' : `${i + 1}. `}${t}`, 2.1)); ys += 2.7; }); });
  el.push(titelblok(o, [W4, H4], { titel: `Montage: ${sc.titel}`.slice(0, 50), nr: `${o.id}-${o.versie === 'pro' ? 'P' : 'T'}-M${meta.i ?? 1}`, schaal: '-', datum: meta.datum ?? '', blad: meta.blad ?? '1 / 1' }));
  return svg(A4L, el.join(''));
}
/** alle montagebladen: [{ id, titel, sub, scène, svg }] */
export function montageBladen(o, meta = {}) {
  const sc = montage(o);
  return sc.map((s, i) => ({ id: s.id, titel: s.titel, sub: s.sub, scène: s, svg: montageBlad(o, s, { ...meta, i: i + 1, blad: `${i + 1} / ${sc.length}` }) }));
}
