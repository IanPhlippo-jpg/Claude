// Opengewerkte tekening (exploded) van een deur: alle stalen delen in hun echte vorm, uit elkaar getrokken (het kozijn
// verder dan de vleugel), met de verstekken in rood, positieballonnen, en bij elke verbinding een code met een stippellijn
// tussen de twee stukken. Rechts de verbindingentabel: welke posities, hoeveel, welke naad en welk lasproces, met een
// kleine schets per soort. Werkt in Node (PDF) en in de browser.
import { veelhoek } from './deuren.mjs';
import { band } from './teken.mjs';
import { stuklijst } from './stuklijst.mjs';
import { W, H, T, L, tabel, titelblok } from './blad.mjs';

const f = (v) => (Math.round(v * 100) / 100).toString();
const rad = (g) => (g * Math.PI) / 180;

/** kortste afstand van punt q tot veelhoek p (0 als het erin ligt) */
function afstand(q, p) {
  let binnen = false, d = Infinity;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const a = p[i], b = p[j];
    if ((a[1] > q[1]) !== (b[1] > q[1]) && q[0] < ((b[0] - a[0]) * (q[1] - a[1])) / (b[1] - a[1]) + a[0]) binnen = !binnen;
    const ab = [b[0] - a[0], b[1] - a[1]], t = Math.max(0, Math.min(1, ((q[0] - a[0]) * ab[0] + (q[1] - a[1]) * ab[1]) / (ab[0] ** 2 + ab[1] ** 2 || 1)));
    d = Math.min(d, Math.hypot(q[0] - a[0] - t * ab[0], q[1] - a[1] - t * ab[1]));
  }
  return binnen ? 0 : d;
}

/** de soorten verbindingen: naam, uitleg (naad en proces) */
export const VERBINDINGEN = {
  V: { naam: 'Verstek 45°', las: 'Hechten binnen en buiten; de zichtkant doorlassen met TIG (ER70S-6 Ø1,6, 90-110 A), de binnenkant MIG (G3Si1 Ø0,8); zichtkant vlak slijpen. Beurtelings lassen, diagonalen meten.' },
  T: { naam: 'T-verbinding (stomp)', las: 'Stomp tegen het kader, het kozijn of de roede; hoeklas a3 rondom, TIG aan de zichtkant, MIG binnen; zichtkant vlak slijpen.' },
  S: { naam: 'Schuin tegen de boog', las: 'Uiteinde schuin zagen volgens de boog (aftekenen op de mal 1:1); passen, hechten, hoeklas a3 rondom met TIG.' },
  B: { naam: 'Boog op kalf, poot of kader', las: 'De lasergesneden boog op de mal leggen; stomp tegen het kalf, de poot of het kader; hoeklas a3 rondom met TIG.' },
};
/** de verbindingen zoals ze bij dit systeem gemaakt worden: aluminium wordt geschroefd, niet gelast */
export function verbindingVan(soort, sys) {
  const V = VERBINDINGEN[soort], w = sys?.verwerking;
  if (!sys?.alu || !w) return V;
  if (soort === 'V') return { naam: 'Verstek 45° (hoekverbinder)', las: w.lassen };
  if (soort === 'T') return { naam: 'T-verbinding (geschroefd)', las: w.roeden };
  return V;
}

/** alle stukken met hun echte vorm (globaal) en alle verbindingen tussen hun uiteinden */
export function verbindingen(o, keuzes = {}) {
  const { posities, stukken } = stuklijst(o, keuzes), sys = o.sys;
  const naar = (s, p) => [p[0] + s.dx, p[1] + s.dy];
  for (const [i, s] of stukken.entries()) {
    s.id = i;
    s.poly = (s.d.a ? veelhoek(s.d, s.w, s.B, s.H) : band(s.d, s.w)).map((p) => naar(s, p));
    s.boog = !s.d.a;
    s.raamwerk = s.d.soort === 'kader' || s.d.soort === 'kozijn' || s.d.soort === 'boogkader' || s.d.soort === 'boogkozijn';
    // de uiteinden (hartlijn) en of ze in verstek zijn
    if (s.d.a) {
      const p = veelhoek(s.d, s.w, s.B, s.H), dx = s.d.b[0] - s.d.a[0], dy = s.d.b[1] - s.d.a[1], l = Math.hypot(dx, dy), u = [dx / l, dy / l];
      const scheef = (q, r) => Math.abs((r[0] - q[0]) * u[0] + (r[1] - q[1]) * u[1]) > 1;
      // verstek = een schuin uiteinde van het kader of het kozijn (een roede die schuin tegen de boog komt is geen verstek)
      s.einden = [{ q: naar(s, s.d.a), verstek: s.raamwerk && scheef(p[0], p[3]) }, { q: naar(s, s.d.b), verstek: s.raamwerk && scheef(p[1], p[2]) }];
    } else s.einden = [s.d.g0, s.d.g1].map((g) => ({ q: naar(s, [s.d.c[0] + s.d.r * Math.cos(rad(g)), s.d.c[1] + s.d.r * Math.sin(rad(g))]), verstek: false }));
  }
  const lijst = [], gezien = new Set(), los = [];
  for (const s of stukken) for (const e of s.einden) {
    // het stuk dat dit uiteinde raakt: binnen 1,5 mm van zijn vorm, niet zichzelf; het dichtste
    // een boog eindigt met zijn hartlijn net naast het stuk waar hij op komt: ruimer zoeken
    let beste = null, bd = s.boog ? s.w / 2 + 1 : 1.5;
    for (const t of stukken) { if (t === s) continue; const d = afstand(e.q, t.poly); if (d < bd) { bd = d; beste = t; } }
    if (!beste) { if (!(s.d.soort === 'kozijn' && Math.abs(e.q[1]) < 1)) los.push({ stuk: s, q: e.q }); continue; }
    const soort = e.verstek && beste.raamwerk ? 'V' : s.boog ? 'B' : s.d.tot || (beste.boog && !s.raamwerk) ? 'S' : beste.boog && s.raamwerk ? 'B' : 'T';
    const sleutel = soort === 'V' ? [Math.min(s.id, beste.id), Math.max(s.id, beste.id)].join('|') : `${s.id}|${beste.id}|${Math.round(e.q[0])}|${Math.round(e.q[1])}`;
    if (gezien.has(sleutel)) continue;
    // een boog op een kader of kalf wordt van beide kanten gevonden: één keer tellen
    const terug = `${beste.id}|${s.id}`;
    if ([...gezien].some((x) => x.startsWith(terug + '|')) && (s.boog || beste.boog)) continue;
    gezien.add(sleutel);
    lijst.push({ soort, a: s, b: beste, q: e.q });
  }
  // groeperen per soort en paar posities: code V1, T1, ...
  const groepen = [];
  for (const v of lijst) {
    const pa = Math.min(v.a.pos, v.b.pos), pb = Math.max(v.a.pos, v.b.pos), k = `${v.soort}|${pa}|${pb}`;
    let gr = groepen.find((x) => x.k === k);
    if (!gr) { gr = { k, soort: v.soort, pa, pb, n: 0 }; groepen.push(gr); }
    gr.n++; v.groep = gr;
  }
  const tel = {};
  groepen.sort((a, b) => 'VTSB'.indexOf(a.soort) - 'VTSB'.indexOf(b.soort) || a.pa - b.pa || a.pb - b.pb).forEach((gr) => { tel[gr.soort] = (tel[gr.soort] ?? 0) + 1; gr.code = `${gr.soort}${tel[gr.soort]}`; });
  return { posities, stukken, verbindingen: lijst, groepen, los, sys };
}

/** kleine schets van een soort verbinding (± 34 x 22 mm) */
function icoon(soort, x, y) {
  const r = (pts, vul = '#d7dadc') => `<polygon points="${pts.map(([a, b]) => `${f(x + a)},${f(y + b)}`).join(' ')}" fill="${vul}" stroke="#111" stroke-width="0.25"/>`;
  const las = (pts) => `<polyline points="${pts.map(([a, b]) => `${f(x + a)},${f(y + b)}`).join(' ')}" fill="none" stroke="#c0392b" stroke-width="0.9" stroke-linecap="round"/>`;
  if (soort === 'V') return r([[2, 2], [30, 2], [22, 10], [2, 10]]) + r([[2, 12], [10, 12], [10, 21], [2, 21]].map(([a, b]) => [a, b])) + r([[32, 4], [32, 21], [24, 21], [24, 12]]) + las([[22.5, 10.5], [31.5, 1.5]]) + T(x + 3, y + 8, '45°', 2, { kleur: '#c0392b' });
  if (soort === 'T') return r([[2, 2], [32, 2], [32, 9], [2, 9]]) + r([[13, 9], [21, 9], [21, 21], [13, 21]]) + las([[12, 9.6], [12, 12]]) + las([[22, 9.6], [22, 12]]) + las([[13, 9.4], [21, 9.4]]);
  if (soort === 'S') return `<path d="M${f(x + 2)},${f(y + 10)} A30,30 0 0 1 ${f(x + 32)},${f(y + 4)} L${f(x + 32)},${f(y + 9)} A25,25 0 0 0 ${f(x + 2)},${f(y + 15)} Z" fill="#d7dadc" stroke="#111" stroke-width="0.25"/>` + r([[13, 12.4], [20, 10.6], [20, 21], [13, 21]]) + las([[13, 12.6], [20, 10.8]]);
  return `<path d="M${f(x + 4)},${f(y + 13)} A13,13 0 0 1 ${f(x + 30)},${f(y + 13)} L${f(x + 25)},${f(y + 13)} A8,8 0 0 0 ${f(x + 9)},${f(y + 13)} Z" fill="#d7dadc" stroke="#111" stroke-width="0.25"/>` + r([[2, 13], [32, 13], [32, 18], [2, 18]]) + las([[4, 12.6], [9, 12.6]]) + las([[25, 12.6], [30, 12.6]]);
}

/** het blad A3 "Opengewerkte tekening"; meta: { nr, datum, blad } */
export function explodeBlad(o, keuzes = {}, meta = {}) {
  const { stukken, verbindingen: vb, groepen, posities } = verbindingen(o, keuzes), el = [];
  // verschuiving: elk stuk weg van het midden van zijn vleugel (of zijlicht); het kozijn weg van het midden van de deur, verder
  const midden = {}, uit = new Map();
  for (const s of stukken) { const m = (midden[s.gi] ??= { x: 0, y: 0, n: 0 }), c = s.poly.reduce((a, p) => [a[0] + p[0] / s.poly.length, a[1] + p[1] / s.poly.length], [0, 0]); m.x += c[0]; m.y += c[1]; m.n++; s.c = c; }
  const KB = o.kozijn.B, KH = o.kozijn.H, fK = 0.2, fV = 0.16;
  for (const s of stukken) {
    const kozijn = s.d.soort === 'kozijn' || s.d.soort === 'boogkozijn', m = kozijn ? { x: KB / 2, y: KH / 2 } : { x: midden[s.gi].x / midden[s.gi].n, y: midden[s.gi].y / midden[s.gi].n };
    let v = [(s.c[0] - m.x) * (kozijn ? fK : fV), (s.c[1] - m.y) * (kozijn ? fK : fV)];
    // het kozijn naar buiten: minstens 90 mm vrij van de vleugel
    if (kozijn) { const n = Math.hypot(...v) || 1; v = [v[0] + (v[0] / n) * 90, v[1] + (v[1] / n) * 90]; }
    // bij 2 vleugels of een zijlicht: de vleugels en zijlichten zelf ook uit elkaar (horizontaal)
    else if (Object.keys(midden).length > 2) v[0] += (m.x - KB / 2) * 0.35;
    uit.set(s, v);
  }
  // schaal: alles past in het linkerdeel (230 x 236 mm)
  const alle = stukken.flatMap((s) => s.poly.map((p) => [p[0] + uit.get(s)[0], p[1] + uit.get(s)[1]]));
  const x0 = Math.min(...alle.map((p) => p[0])), x1 = Math.max(...alle.map((p) => p[0])), y0 = Math.min(...alle.map((p) => p[1])), y1 = Math.max(...alle.map((p) => p[1]));
  const sc = Math.min(200 / (x1 - x0), 228 / (y1 - y0)), ox = 45 + (200 - (x1 - x0) * sc) / 2, oy = 252;
  const X = (x) => ox + (x - x0) * sc, Y = (y) => oy - (y - y0) * sc;
  el.push(T(26, 17, 'Opengewerkte tekening: de stalen delen uit elkaar, gezien van de kant met de greep', 3, { vet: true }));
  el.push(T(26, 21.5, 'Rood: verstek 45° (zagen in verstek). Stippellijn: deze twee stukken komen hier aan elkaar; de code staat in de tabel rechts.', 2.1, { kleur: '#333' }));
  for (const s of stukken) {
    const [vx, vy] = uit.get(s), pts = s.poly.map(([x, y]) => [X(x + vx), Y(y + vy)]);
    el.push(`<polygon data-pos="${s.pos}" points="${pts.map(([a, b]) => `${f(a)},${f(b)}`).join(' ')}" fill="${s.raamwerk ? '#c9cdd0' : '#e2e5e7'}" stroke="#111" stroke-width="0.22" stroke-linejoin="round"/>`);
    if (s.d.a) {
      // de verstekken rood
      const p = veelhoek(s.d, s.w, s.B, s.H).map((q) => [X(q[0] + s.dx + vx), Y(q[1] + s.dy + vy)]);
      for (const [i, j, e] of [[0, 3, 0], [1, 2, 1]]) if (s.einden[e].verstek) el.push(`<line x1="${f(p[i][0])}" y1="${f(p[i][1])}" x2="${f(p[j][0])}" y2="${f(p[j][1])}" stroke="#c0392b" stroke-width="0.8"/>`);
    }
  }
  // verbindingen: stippellijn tussen de twee verschoven uiteinden, code in het midden
  for (const v of vb) {
    const a = [X(v.q[0] + uit.get(v.a)[0]), Y(v.q[1] + uit.get(v.a)[1])], b = [X(v.q[0] + uit.get(v.b)[0]), Y(v.q[1] + uit.get(v.b)[1])], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    el.push(`<line x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}" stroke="#1f5fa8" stroke-width="0.22" stroke-dasharray="1.2 0.8"/>`);
    el.push(`<rect x="${f(m[0] - 3)}" y="${f(m[1] - 1.7)}" width="6" height="3.4" rx="0.8" fill="#fff" stroke="#1f5fa8" stroke-width="0.2"/>`, T(m[0], m[1] + 1, v.groep.code, 2, { anker: 'middle', kleur: '#1f5fa8', vet: true }));
  }
  // positieballonnen: één per positie, naast het stuk
  const gehad = new Set();
  for (const s of stukken) {
    if (gehad.has(s.pos)) continue; gehad.add(s.pos);
    const [vx, vy] = uit.get(s), c = [X(s.c[0] + vx), Y(s.c[1] + vy)];
    el.push(L(c[0], c[1], c[0] + 2.2, c[1] - 2.2, 0.15), `<g data-pos="${s.pos}"><circle cx="${f(c[0] + 4)}" cy="${f(c[1] - 4)}" r="2.6" fill="#fff" stroke="#111" stroke-width="0.25"/>`, T(c[0] + 4, c[1] - 3.1, String(s.pos), 2.2, { anker: 'middle', vet: true }), '</g>');
  }
  // rechts: de verbindingentabel en een schets per soort
  const naam = (p) => posities.find((x) => x.pos === p)?.naam ?? '';
  const rijen = groepen.map((gr) => [gr.code, gr.n, `${gr.pa} ${naam(gr.pa)}`, `${gr.pb} ${naam(gr.pb)}`, verbindingVan(gr.soort, o.sys).naam]);
  const max = 34, [tt, th] = tabel(253, 20, [['Code', 11], ['n', 8, 1], ['Stuk', 50], ['tegen stuk', 50], ['Soort', 37]], rijen.slice(0, max), 3.9, 1.95);
  el.push(T(253, 17, 'Verbindingen', 3, { vet: true }), tt);
  if (rijen.length > max) el.push(T(253, 20 + th + 3, `+ ${rijen.length - max} verbindingen: zie de stuklijst en de werkwijze`, 2, { kleur: '#555' }));
  let y = Math.min(20 + th + 8, 175);
  const soorten = [...new Set(groepen.map((gr) => gr.soort))];
  for (const sr of soorten) {
    if (y > 226) break;
    el.push(icoon(sr, 253, y), T(290, y + 4, verbindingVan(sr, o.sys).naam, 2.4, { vet: true }));
    const woorden = verbindingVan(sr, o.sys).las.split(' '), lijnen = [''];
    for (const w of woorden) { if ((lijnen.at(-1) + ' ' + w).length > 70) lijnen.push(w); else lijnen[lijnen.length - 1] += (lijnen.at(-1) ? ' ' : '') + w; }
    lijnen.slice(0, 4).forEach((l, i) => el.push(T(290, y + 8 + i * 3.3, l, 2)));
    y += 26;
  }
  if (o.sys.roede.lat && y < 246) el.push(T(253, y + 2, 'Latten op de roeden (30x3): voor gehecht om de 150 en gelast, achter geschroefd met M4 verzonken om de 250.', 2, { kleur: '#333' }));
  el.push(titelblok(o, { ...meta, titel: `Opengewerkte tekening ${o.stijl.naam} · opening ${o.B} x ${o.H}`, schaal: 'schets' }));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}mm" height="${H}mm" font-family="Arial, Helvetica, sans-serif"><rect width="${W}" height="${H}" fill="#fff"/><rect x="20" y="10" width="${W - 30}" height="${H - 20}" fill="none" stroke="#111" stroke-width="0.7"/>${el.join('\n')}</svg>`;
}
