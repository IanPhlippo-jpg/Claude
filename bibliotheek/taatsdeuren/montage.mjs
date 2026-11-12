// Montagebladen A4 liggend: per verbinding van de deur (verbinding.mjs) een isometrische tekening uit elkaar met
// positieballonnen, klein de verbinding samen, de onderdelen met hun bevestigingsmiddelen (norm) en de stappen. De 3D
// wordt zonder three getekend: elk prisma als vlakken, belicht en van achter naar voor geschilderd. Kader en titelblok
// zoals de detailbladen (ISO 5457, ISO 7200). Werkt in Node (PDF) en in de browser.
import { montage, vlakken } from './verbinding.mjs';
import { esc } from './blad.mjs';

const W4 = 297, H4 = 210;
const f = (v) => (Math.round(v * 100) / 100).toString();
const T = (x, y, t, h = 2.5, o = {}) => `<text x="${f(x)}" y="${f(y)}" font-size="${h}"${o.anker ? ` text-anchor="${o.anker}"` : ''}${o.vet ? ' font-weight="700"' : ''}${o.kleur ? ` fill="${o.kleur}"` : ''}>${esc(t)}</text>`;
const L = (x1, y1, x2, y2, w = 0.25, kleur = '#111') => `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${kleur}" stroke-width="${w}"/>`;

// ---------------------------------------------------------------- projectie en schilderen
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgb = (c) => `rgb(${c.map((x) => Math.max(0, Math.min(255, Math.round(x)))).join(',')})`;
/** kijkrichting: van rechts voor, iets van boven (draaien om y, dan kantelen om x) */
export function kijk(yaw = -32, pitch = 24) {
  const a = (yaw * Math.PI) / 180, b = (pitch * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
  const rot = ([x, y, z]) => { const xr = x * ca + z * sa, zr = -x * sa + z * ca; return [xr, y * cb - zr * sb, y * sb + zr * cb]; };
  return { rot };
}
const LICHT = (() => { const l = [-0.45, 0.75, 0.55], n = Math.hypot(...l); return l.map((x) => x / n); })();

/** alle vlakken van een scène met verschuiving t (0 = samen, 1 = uit elkaar), in beeldcoördinaten */
function scèneVlakken(sc, t, V) {
  const uit = [];
  for (const d of sc.delen) {
    if ((d.alleenSamen && t > 0.05) || (d.alleenUit && t < 0.05)) continue;
    const off = (d.uit ?? [0, 0, 0]).map((x) => x * t);
    for (const s of d.solids) for (const v of vlakken(s)) {
      const p = v.pts.map(([x, y, z]) => V.rot([x + off[0], y + off[1], z + off[2]])), n = V.rot(v.n);
      uit.push({ p, n, diep: p.reduce((s2, q) => s2 + q[2], 0) / p.length, d, naad: !!s.naad });
    }
  }
  return uit;
}
/** het ankerpunt van een deel (voor de ballon): het midden van zijn eerste prisma */
function anker(d, t, V) {
  const s = d.solids[0], ps = vlakken(s).flatMap((v) => v.pts), off = (d.uit ?? [0, 0, 0]).map((x) => x * t);
  const m = [0, 1, 2].map((k) => ps.reduce((a, p) => a + p[k], 0) / ps.length + off[k]);
  return V.rot(m);
}

/** teken de scène in het vak [x, y, w, h]; geeft { svg, ankers: [{ nr, x, y }] } */
export function tekenScène(sc, { t = 1, vak = [0, 0, 100, 100], yaw, pitch, nummers = true } = {}) {
  const V = kijk(yaw, pitch), vl = scèneVlakken(sc, t, V);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const v of vl) for (const [x, y] of v.p) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, -y); y1 = Math.max(y1, -y); }
  const [vx, vy, vw, vh] = vak, s = Math.min(vw / (x1 - x0 || 1), vh / (y1 - y0 || 1)), ox = vx + (vw - (x1 - x0) * s) / 2 - x0 * s, oy = vy + (vh - (y1 - y0) * s) / 2 - y0 * s;
  const naar = ([x, y]) => [ox + x * s, oy - y * s];
  const el = [];
  vl.sort((a, b) => a.diep - b.diep);
  for (const v of vl) {
    if (v.n[2] < -1e-6) continue; // achterkant
    const c = hex(v.d.kleur), lam = Math.max(0, v.n[0] * LICHT[0] + v.n[1] * LICHT[1] + v.n[2] * LICHT[2]), k = 0.5 + 0.55 * lam;
    const vul = rgb(c.map((x) => x * k + 18)), rand = rgb(c.map((x) => x * 0.38));
    // de naden van een geboorde wand (sectoren rond het gat) niet tekenen: de rand in de kleur van het vlak
    el.push(`<polygon points="${v.p.map((q) => naar(q).map(f).join(',')).join(' ')}" fill="${vul}"${v.d.alpha ? ` fill-opacity="${v.d.alpha}"` : ''} stroke="${v.naad ? vul : rand}" stroke-width="${f(v.naad ? 0.22 : Math.min(0.22, Math.max(0.06, s * 0.12)))}" stroke-linejoin="round"/>`);
  }
  const ankers = nummers ? sc.delen.filter((d) => d.nr && !(d.alleenSamen && t > 0.05) && !(d.alleenUit && t < 0.05)).map((d) => { const [x, y] = naar(anker(d, t, V)); return { nr: d.nr, x, y }; }) : [];
  // de gaten: een vierkantje met een letter bij elk gat (zoals de ballonnen bij de delen)
  const gatAnkers = nummers ? (sc.gaten ?? []).map((g, i) => { const d = sc.delen.find((x) => x.naam === g.volg), off = (d?.uit ?? [0, 0, 0]).map((x) => x * t); const [x, y] = naar(V.rot([g.p[0] + off[0], g.p[1] + off[1], g.p[2] + off[2]])); return { letter: 'abcdefgh'[i], x, y }; }) : [];
  for (const a of gatAnkers) {
    const bx = a.x + 7, by = a.y - 7;
    el.push(L(a.x, a.y, bx - 2, by + 2, 0.2, '#b42318'), `<circle cx="${f(a.x)}" cy="${f(a.y)}" r="0.55" fill="#b42318"/>`, `<rect x="${f(bx - 2)}" y="${f(by - 2.4)}" width="4.6" height="4.6" fill="#fff" stroke="#b42318" stroke-width="0.35"/>`, T(bx + 0.3, by + 1, a.letter, 3, { anker: 'middle', vet: true, kleur: '#b42318' }));
  }
  return { svg: el.join(''), ankers, gatAnkers, schaal: s };
}

/** ballonnen links en rechts van de tekening, met een leiderlijn naar het deel; zonder kruisen (gesorteerd op hoogte) */
function ballonnen(ankers, [vx, vy, vw, vh]) {
  const el = [], mx = vx + vw / 2, r = 3.4;
  for (const kant of [-1, 1]) {
    const lijst = ankers.filter((a) => (kant < 0 ? a.x <= mx : a.x > mx)).sort((a, b) => a.y - b.y);
    const bx = kant < 0 ? vx - 1 : vx + vw + 1, stap = Math.max(2 * r + 1.5, 0), ys = [];
    for (const a of lijst) ys.push(Math.max(a.y, (ys.at(-1) ?? vy - 99) + stap));
    // te laag: naar boven schuiven
    const max = vy + vh; for (let i = ys.length - 1; i >= 0; i--) { const lim = i === ys.length - 1 ? max : ys[i + 1] - stap; if (ys[i] > lim) ys[i] = lim; }
    lijst.forEach((a, i) => {
      const y = ys[i];
      el.push(L(bx - kant * r, y, a.x, a.y, 0.2), `<circle cx="${f(a.x)}" cy="${f(a.y)}" r="0.6" fill="#111"/>`, `<circle cx="${f(bx)}" cy="${f(y)}" r="${r}" fill="#fff" stroke="#111" stroke-width="0.35"/>`, T(bx, y + 1.3, String(a.nr), 3.4, { anker: 'middle', vet: true }));
    });
  }
  return el.join('');
}

const rij = (t, max) => { const w = String(t).split(' '), uit = ['']; for (const x of w) { if ((uit.at(-1) + ' ' + x).length > max) uit.push(x); else uit[uit.length - 1] += (uit.at(-1) ? ' ' : '') + x; } return uit; };

/** één montageblad (A4 liggend) */
export function montageBlad(o, sc, meta = {}) {
  const el = [], alu = sc.materiaal === 'alu', kl = alu ? '#2f6db3' : '#c2410c';
  el.push(`<rect x="20" y="10" width="${W4 - 30}" height="${H4 - 20}" fill="none" stroke="#111" stroke-width="0.7"/>`);
  // kop: materiaal-label, titel, systeem
  el.push(`<rect x="24" y="14" width="${alu ? 34 : 22}" height="7" fill="${kl}"/>`, T(alu ? 41 : 35, 19.2, alu ? 'ALUMINIUM' : 'STAAL', 3.6, { anker: 'middle', vet: true, kleur: '#fff' }));
  el.push(T(alu ? 62 : 50, 19.3, `${meta.nr ?? ''} Montage ${meta.i ?? ''}: ${sc.titel}`, 4.4, { vet: true }), T(24, 26, `${sc.sub} · ${o.sys.naam}`, 2.6, { kleur: '#333' }));
  // tekening uit elkaar (links) en samen (rechts boven)
  const vak = [32, 32, 140, 118], gross = tekenScène(sc, { t: 1, vak, ...(sc.kijk ?? {}) });
  el.push(gross.svg, ballonnen(gross.ankers, vak));
  el.push(T(vak[0] + vak[2] / 2, 156, 'Uit elkaar (zonder schaal)', 2.4, { anker: 'middle', kleur: '#555' }));
  const klein = tekenScène(sc, { t: 0, vak: [190, 30, 92, 50], nummers: false, ...(sc.kijk ?? {}) });
  el.push(`<rect x="186" y="28" width="100" height="58" fill="#f6f7f8" stroke="#bbb" stroke-width="0.2"/>`, klein.svg, T(236, 84, 'Samen', 2.4, { anker: 'middle', kleur: '#555' }));
  // onderdelen en bevestigingsmiddelen
  let y = 92;
  el.push(T(186, y, 'Onderdelen', 2.9, { vet: true })); y += 3.5;
  for (const d of sc.delen.filter((x) => x.nr)) {
    const lijnen = rij(`${d.naam}${d.label ? `: ${d.label}` : ''}`, 66).slice(0, 2);
    el.push(`<circle cx="188.4" cy="${f(y - 0.9)}" r="2.1" fill="#fff" stroke="#111" stroke-width="0.25"/>`, T(188.4, y, String(d.nr), 2.1, { anker: 'middle', vet: true }), `<rect x="191.6" y="${f(y - 2.4)}" width="2.6" height="2.6" fill="${d.kleur}" stroke="#555" stroke-width="0.12"/>`);
    lijnen.forEach((t, i) => el.push(T(195.6, y + i * 2.7, t, 2.05)));
    y += 2.7 * lijnen.length + 1.1;
  }
  if (sc.gaten?.length) {
    y += 1.2; el.push(T(186, y, 'Gaten (ISO 15786: ⌵ = verzinking)', 2.9, { vet: true })); y += 3.4;
    sc.gaten.forEach((g, i) => { const l = rij(g.tekst, 64).slice(0, 2); el.push(`<rect x="186.2" y="${f(y - 2.6)}" width="3.4" height="3.4" fill="#fff" stroke="#b42318" stroke-width="0.3"/>`, T(187.9, y, 'abcdefgh'[i], 2.3, { anker: 'middle', vet: true, kleur: '#b42318' })); l.forEach((t, j) => el.push(T(191, y + j * 2.6, t, 2.05))); y += 2.6 * l.length + 0.8; });
  }
  y += 1.5;
  el.push(T(186, y, 'Bevestiging en norm', 2.9, { vet: true })); y += 3.4;
  for (const [wat, n, norm] of sc.middelen) { const l = rij(`${wat} · ${n}${norm ? ` · ${norm}` : ''}`, 70).slice(0, 2); if (y + 2.6 * l.length > H4 - 37) { el.push(T(186, y, '… zie de stuklijst', 2.05, { kleur: '#555' })); break; } l.forEach((t, i) => el.push(T(186, y + i * 2.6, `${i ? '  ' : '• '}${t}`, 2.05))); y += 2.6 * l.length + 0.5; }
  // stappen onderaan links
  let ys = 161;
  el.push(T(24, ys, 'Zo bouw je het', 2.9, { vet: true })); ys += 3.6;
  const letL = sc.let ? rij(`Let op: ${sc.let}`, 96).slice(0, 2) : [], grens = H4 - 12.5 - 2.7 * letL.length;
  sc.stappen.forEach((s, i) => { const l = rij(s, 96); l.forEach((t, j) => { if (ys < grens) el.push(T(j ? 28 : 24, ys, `${j ? '' : `${i + 1}. `}${t}`, 2.1)); ys += 2.65; }); ys += 0.3; });
  if (letL.length) { const y0 = Math.min(ys + 1.2, grens + 1.5); letL.forEach((t, i) => el.push(T(24, y0 + i * 2.65, t, 2.1, { kleur: kl, vet: true }))); }
  // titelblok A4 (ISO 7200, ingekort)
  const tx = W4 - 10 - 100, ty = H4 - 10 - 24, veld = (x, r, kop, w, h = 2.3, vet = false) => { if (x) el.push(L(tx + x, ty + r * 8, tx + x, ty + r * 8 + 8)); el.push(T(tx + x + 1, ty + r * 8 + 2.5, kop, 1.6, { kleur: '#555' }), T(tx + x + 1, ty + r * 8 + 6.5, w, h, { vet })); };
  el.push(`<rect x="${tx}" y="${ty}" width="100" height="24" fill="#fff" stroke="#111" stroke-width="0.5"/>`, L(tx, ty + 8, tx + 100, ty + 8), L(tx, ty + 16, tx + 100, ty + 16));
  veld(0, 0, 'Titel', `Montage: ${sc.titel}`.slice(0, 44), 2.5, true);
  veld(0, 1, 'Deur', `${o.stijl.naam} · ${o.B} x ${o.H}`.slice(0, 34), 2.2); veld(62, 1, 'Tekeningnummer', `${meta.nr ?? 'TD'}-M${meta.i ?? 1}`, 2.3, true);
  veld(0, 2, 'Opgesteld', 'Ian · laswerken', 2.1); veld(36, 2, 'Uitgifte', meta.datum ?? '', 2.1); veld(62, 2, 'Blad', meta.blad ?? '1 / 1', 2.1);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W4} ${H4}" width="${W4}mm" height="${H4}mm" font-family="Arial, Helvetica, sans-serif"><rect width="${W4}" height="${H4}" fill="#fff"/>${el.join('\n')}</svg>`;
}

/** alle montagebladen van een deur: [{ id, titel, svg }] */
export function montageBladen(o, keuzes = {}, meta = {}) {
  const sc = montage(o, keuzes);
  return sc.map((s, i) => ({ id: s.id, titel: s.titel, sub: s.sub, scène: s, svg: montageBlad(o, s, { ...meta, i: i + 1, blad: `${i + 1} / ${sc.length}` }) }));
}
