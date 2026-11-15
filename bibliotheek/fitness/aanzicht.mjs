// Aanzichten van een toestel zonder three: elke balk als vlakken, geprojecteerd (vooraanzicht, bovenaanzicht en
// linkeraanzicht in eerste hoekprojectie volgens ISO 5456-2, of isometrisch) en van achter naar voor geschilderd.
// Voor de overzichtsbladen (wit met zwarte lijnen) en voor de miniaturen (belicht, in kleur). Node en browser.
import { hoeken, sub, cross, norm, dot } from './model.mjs';

const f = (v) => (Math.round(v * 100) / 100).toString();
/** de projecties: p -> [papier-x, papier-y (omlaag), diepte (groot = dichtbij)] */
export const PROJ = {
  voor: (p) => [p[0], -p[2], -p[1]],
  boven: (p) => [p[0], -p[1], p[2]],
  links: (p) => [-p[1], -p[2], -p[0]],
  rechts: (p) => [p[1], -p[2], p[0]],
};
export function iso(yaw = -35, pitch = 28) {
  const a = (yaw * Math.PI) / 180, b = (pitch * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
  return (p) => { const x = p[0] * ca - p[1] * sa, y = p[0] * sa + p[1] * ca; return [x, -(y * sb + p[2] * cb), -y * cb + p[2] * sb]; };
}
/** de vlakken van een balk: 4 of 12 zijvlakken en 2 kopvlakken */
export function vlakken(g) {
  const h = hoeken(g), n = h.length / 2, uit = [];
  uit.push({ pts: h.slice(0, n).reverse(), kop: true }, { pts: h.slice(n), kop: true });
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; uit.push({ pts: [h[i], h[j], h[n + j], h[n + i]], kop: false, rond: g.rond }); }
  const c = [0, 1, 2].map((k) => h.reduce((t, p) => t + p[k], 0) / h.length);
  for (const v of uit) {
    let nn = norm(cross(sub(v.pts[1], v.pts[0]), sub(v.pts[2], v.pts[0])));
    const m = [0, 1, 2].map((k) => v.pts.reduce((t, p) => t + p[k], 0) / v.pts.length);
    if (dot(nn, sub(m, c)) < 0) nn = nn.map((x) => -x);
    v.n = nn; v.m = m;
  }
  return uit;
}
const KLEUR = { kap: '#9aa5b1', context: '#c8c8c8', frame: '#c9ccd0', leer: '#3b3e42', hout: '#c8a878', zink: '#b9bec4', rubber: '#2b2b2b', chroom: '#d7dde2', uhmw: '#f2f2f2', kabel: '#202020', schijf: '#30343a', katrol: '#41454a', stapel: '#5b6168' };
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgb = (c) => `rgb(${c.map((x) => Math.max(0, Math.min(255, Math.round(x)))).join(',')})`;

/**
 * teken balken in een projectie. opts: { proj, schaal, ox, oy, stijl: 'lijn' | 'kleur', kleur: { frame: '#hex' }, lw }
 * geeft { svg, box: [x0, y0, x1, y1] } in papiercoördinaten
 */
export function tekenBalken(geo, { proj = PROJ.voor, schaal = 0.1, ox = 0, oy = 0, stijl = 'lijn', kleur = {}, lw = 0.25 } = {}) {
  const vl = [];
  const kijk = (() => { const o = proj([0, 0, 0]), dx = proj([1, 0, 0])[2] - o[2], dy = proj([0, 1, 0])[2] - o[2], dz = proj([0, 0, 1])[2] - o[2]; return [dx, dy, dz]; })(); // richting naar de kijker
  for (const g of geo) { const od = proj([(g.a[0] + g.b[0]) / 2, (g.a[1] + g.b[1]) / 2, (g.a[2] + g.b[2]) / 2])[2]; for (const v of vlakken(g)) {
    if (dot(v.n, kijk) <= 1e-6) continue;
    const p = v.pts.map((q) => proj(q)), diep = p.reduce((t, q) => t + q[2], 0) / p.length;
    vl.push({ p, diep, od, g, v });
  } }
  vl.sort((a, b) => a.od - b.od || a.diep - b.diep);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const el = [];
  const L = norm([0.35, 0.55, 0.75]);
  for (const { p, g, v } of vl) {
    const pts = p.map(([x, y]) => [ox + x * schaal, oy + y * schaal]);
    for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    let vul, rand, w = lw;
    if (stijl === 'kleur') {
      const c = hex(kleur[g.kleur] ?? KLEUR[g.kleur] ?? '#999999'), k = 0.55 + 0.5 * Math.max(0, dot(v.n, L));
      vul = rgb(c.map((x) => x * k + 12)); rand = rgb(c.map((x) => x * 0.45)); w = v.rond && !v.kop ? 0 : lw;
      if (g.kleur === 'kap') { el.push(`<polygon points="${pts.map(([x, y]) => `${f(x)},${f(y)}`).join(' ')}" fill="${vul}" fill-opacity="0.18" stroke="${rand}" stroke-width="${lw * 0.5}"/>`); continue; }
    } else {
      vul = g.kleur === 'kap' || g.kleur === 'context' ? 'none' : g.kleur === 'leer' ? '#ececec' : g.kleur === 'hout' ? '#f3ead9' : g.kleur === 'schijf' ? '#f4f4f4' : g.kleur === 'kabel' ? '#111' : '#fff';
      rand = '#111'; w = g.kleur === 'kabel' ? lw * 0.6 : lw;
      if (v.rond && !v.kop) { el.push(`<polygon points="${pts.map(([x, y]) => `${f(x)},${f(y)}`).join(' ')}" fill="${vul}" stroke="${vul}" stroke-width="0.05"/>`); continue; }
    }
    el.push(`<polygon points="${pts.map(([x, y]) => `${f(x)},${f(y)}`).join(' ')}" fill="${vul}" stroke="${rand}" stroke-width="${w}" stroke-linejoin="round"/>`);
  }
  // ronde balken: de omtreklijnen langs de as (de zijvlakken zelf zonder randen)
  if (stijl === 'lijn') for (const g of geo) if (g.rond) {
    // silhouet: twee lijnen evenwijdig aan de geprojecteerde as
    const a = proj(g.a), b = proj(g.b), d = [b[0] - a[0], b[1] - a[1]], l = Math.hypot(...d);
    if (l * schaal < 0.3) continue;
    const nx = -d[1] / l, ny = d[0] / l, r = g.bw / 2;
    for (const s of [-1, 1]) el.push(`<line x1="${f(ox + (a[0] + nx * r * s) * schaal)}" y1="${f(oy + (a[1] + ny * r * s) * schaal)}" x2="${f(ox + (b[0] + nx * r * s) * schaal)}" y2="${f(oy + (b[1] + ny * r * s) * schaal)}" stroke="#111" stroke-width="${lw * 0.8}" opacity="0.55"/>`);
  }
  return { svg: el.join(''), box: [x0, y0, x1, y1] };
}
/** de omhullende in een projectie (model-mm): [x0, y0, x1, y1] */
export function omhullende(geo, proj) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const g of geo) for (const p of hoeken(g)) { const [x, y] = proj(p); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return [x0, y0, x1, y1];
}
/** alle balken van een toestel (zonder de schijven en de stang voor de 3D, tenzij metToon) */
export const alleGeo = (o, metToon = false) => [...o.delen.flatMap((d) => d.geo), ...o.kussens.flatMap((d) => d.geo), ...o.koop.flatMap((d) => d.geo), ...(metToon ? o.toon : [])];

/** miniatuur (SVG, belicht) voor de catalogus */
export function miniatuur(o, { w = 240, h = 180, kleur = {}, metToon = true } = {}) {
  const geo = alleGeo(o, metToon), P = iso(-38, 24), [x0, y0, x1, y1] = omhullende(geo, P), s = Math.min((w - 16) / (x1 - x0), (h - 16) / (y1 - y0));
  const t = tekenBalken(geo, { proj: P, schaal: s, ox: (w - (x1 - x0) * s) / 2 - x0 * s, oy: (h - (y1 - y0) * s) / 2 - y0 * s, stijl: 'kleur', kleur, lw: 0.4 });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${t.svg}</svg>`;
}
