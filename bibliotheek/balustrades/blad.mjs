// Bladen voor de balustrades: kader (ISO 5457), titelblok (ISO 7200) met het projectiesymbool eerste hoek (ISO 5456-2),
// maatlijnen (ISO 129-1) en lassymbolen (ISO 2553). De tekst- en tabelhulpen komen uit de taatsdeuren (blad.mjs).
// Node en browser.
import { T, L, g, tabel, esc } from '../taatsdeuren/blad.mjs';
import { SOORTEN, STIJL } from './onderdelen.mjs';

export { T, L, g, tabel, esc };
export const A3 = [420, 297], A4L = [297, 210], A4 = [210, 297];
export const f = (v) => (Math.round(v * 100) / 100).toString();
export const svg = ([w, h], inhoud) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}mm" height="${h}mm" font-family="Arial, Helvetica, sans-serif"><rect width="${w}" height="${h}" fill="#fff"/><rect x="20" y="10" width="${w - 30}" height="${h - 20}" fill="none" stroke="#111" stroke-width="0.7"/>${inhoud}</svg>`;
export const poly = (pts, vul = 'none', sw = 0.25, extra = '') => `<polygon points="${pts.map(([x, y]) => `${f(x)},${f(y)}`).join(' ')}" fill="${vul}" stroke="#111" stroke-width="${sw}" stroke-linejoin="round"${extra}/>`;
export const lijn = (x1, y1, x2, y2, w = 0.25, kleur = '#111', streep = '') => `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${kleur}" stroke-width="${w}"${streep ? ` stroke-dasharray="${streep}"` : ''}/>`;
export const tk = (x, y, t, h = 2.5, o = {}) => `<text x="${f(x)}" y="${f(y)}" font-size="${h}"${o.anker ? ` text-anchor="${o.anker}"` : ''}${o.vet ? ' font-weight="700"' : ''}${o.kleur ? ` fill="${o.kleur}"` : ''}${o.draai ? ` transform="rotate(${o.draai} ${f(x)} ${f(y)})"` : ''}>${esc(t)}</text>`;

const pijl = (x, y, dx, dy, k = 1) => { const n = [-dy, dx]; return `<polygon points="${f(x)},${f(y)} ${f(x + dx * 2.5 * k + n[0] * 0.6 * k)},${f(y + dy * 2.5 * k + n[1] * 0.6 * k)} ${f(x + dx * 2.5 * k - n[0] * 0.6 * k)},${f(y + dy * 2.5 * k - n[1] * 0.6 * k)}" fill="#111"/>`; };
/** maatlijn van p tot q (papier-mm), op afstand 'af' naast de lijn (links van p->q), met tekst; ISO 129-1 */
export function maat(p, q, af, tekst, h = 2.5) {
  const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1, u = [dx / l, dy / l], n = [-u[1], u[0]];
  const a = [p[0] + n[0] * af, p[1] + n[1] * af], b = [q[0] + n[0] * af, q[1] + n[1] * af], s = Math.sign(af) || 1;
  let hoek = (Math.atan2(dy, dx) * 180) / Math.PI; if (hoek > 90.1 || hoek < -89.9) hoek += 180;
  const m = [(a[0] + b[0]) / 2 + n[0] * s * 1.0, (a[1] + b[1]) / 2 + n[1] * s * 1.0];
  const kort = l < 7;
  return [lijn(p[0] + n[0] * s, p[1] + n[1] * s, a[0] + n[0] * s * 1.5, a[1] + n[1] * s * 1.5, 0.18), lijn(q[0] + n[0] * s, q[1] + n[1] * s, b[0] + n[0] * s * 1.5, b[1] + n[1] * s * 1.5, 0.18), lijn(a[0], a[1], b[0], b[1], 0.18),
    kort ? pijl(a[0], a[1], -u[0], -u[1]) + pijl(b[0], b[1], u[0], u[1]) : pijl(a[0], a[1], u[0], u[1]) + pijl(b[0], b[1], -u[0], -u[1]),
    `<text x="${f(m[0])}" y="${f(m[1])}" font-size="${h}" text-anchor="middle" dominant-baseline="${s * n[1] < 0 || (n[1] === 0 && s * n[0] < 0) ? 'auto' : 'hanging'}" transform="rotate(${f(hoek)} ${f(m[0])} ${f(m[1])})">${esc(tekst)}</text>`].join('');
}
/** projectiesymbool eerste hoek (ISO 5456-2, methode E): afgeknotte kegel, het linkeraanzicht rechts */
export function eersteHoek(x, y, s = 1) {
  return `<g transform="translate(${f(x)} ${f(y)}) scale(${s})"><polygon points="0,2.5 8,0 8,10 0,7.5" fill="none" stroke="#111" stroke-width="0.3"/><line x1="-1.5" y1="5" x2="9.5" y2="5" stroke="#111" stroke-width="0.15" stroke-dasharray="2 0.6 0.4 0.6"/><circle cx="15" cy="5" r="5" fill="none" stroke="#111" stroke-width="0.3"/><circle cx="15" cy="5" r="2.5" fill="none" stroke="#111" stroke-width="0.3"/><line x1="9" y1="5" x2="21" y2="5" stroke="#111" stroke-width="0.15" stroke-dasharray="2 0.6 0.4 0.6"/></g>`;
}
/** de titel van de balustrade */
export const naamVan = (o) => `${SOORTEN[o.k.soort].kort} · ${STIJL(o.k.soort, o.k.stijl).naam}`;
export const maatTekst = (o) => `${o.segs.map((s) => Math.round(s.Lh)).join(' + ')} mm · H ${o.k.H}`;

/** de datum van vandaag (JJJJ-MM-DD) voor het titelblok */
export const vandaag = () => new Date().toISOString().slice(0, 10);
/** tekeningnummer van blad n in het dossier: BA-S1-03 */
export const bladNr = (basis, n) => `${basis ?? 'BA'}-${String(n).padStart(2, '0')}`;
/** schalen volgens ISO 5455 (verkleining) */
export const ISO5455 = [1, 2, 5, 10, 20, 50, 100, 200];
/** de grootste ISO 5455-schaal 1:n die kleiner of gelijk is aan s */
export const isoSchaal = (s) => ISO5455.find((n) => 1 / n <= s + 1e-9) ?? 200;

/**
 * titelblok ISO 7200 rechtsonder: 180 x 32 (A3) of 125 x 28 (A4), met de verplichte velden (eigenaar, titel,
 * tekeningnummer, uitgiftedatum, opgesteld door, goedgekeurd door, documenttype) en blad n / totaal;
 * opts { titel, nr, rev, datum, blad, schaal, type, goedgekeurd }
 */
export function titelblok(o, [w, h], opts = {}) {
  const groot = w >= 400, bw = groot ? 180 : 125, bh = groot ? 32 : 28, rh = bh / 4, tx = w - 10 - bw, ty = h - 10 - bh, el = [];
  el.push(`<rect x="${tx}" y="${ty}" width="${bw}" height="${bh}" fill="#fff" stroke="#111" stroke-width="0.5"/>`);
  for (let i = 1; i < 4; i++) el.push(lijn(tx, ty + i * rh, tx + bw, ty + i * rh, 0.25));
  const veld = (xx, rij, kop, waarde, hh = 2.4, vet = false, max = groot ? 80 : 56) => { if (xx > 0) el.push(lijn(tx + xx, ty + rij * rh, tx + xx, ty + rij * rh + rh, 0.25)); el.push(tk(tx + xx + 1, ty + rij * rh + 2.3, kop, 1.5, { kleur: '#555' }), tk(tx + xx + 1, ty + rij * rh + rh - 1.4, String(waarde).slice(0, max), hh, { vet })); };
  const k1 = bw * 0.3, k2 = bw * 0.5, k3 = bw * 0.62, k4 = bw * 0.8;
  veld(0, 0, 'Eigenaar', 'Ian · laswerken', groot ? 2.5 : 2.0, true); veld(k1, 0, 'Opgesteld door', 'Ian', groot ? 2.2 : 1.8); veld(k2, 0, 'Goedgekeurd door', opts.goedgekeurd ?? '—', groot ? 2.2 : 1.8); veld(k4, 0, 'Projectie', '', 2);
  el.push(eersteHoek(tx + k4 + (groot ? 12 : 8), ty + (groot ? 3.2 : 2.8), groot ? 0.4 : 0.3));
  veld(0, 1, 'Titel', opts.titel ?? `Balustrade ${naamVan(o)}`, groot ? 2.8 : 2.3, true, groot ? 84 : 56); veld(k4, 1, 'Documenttype', opts.type ?? 'werktekening', groot ? 2.0 : 1.6);
  veld(0, 2, 'Balustrade', `${naamVan(o)} · ${maatTekst(o)}`, groot ? 2.1 : 1.6, false, groot ? 70 : 52); veld(k3, 2, 'Tekeningnummer', opts.nr ?? 'BA-01', groot ? 2.3 : 2.0, true); veld(k4 + (groot ? 12 : 8), 2, 'Rev.', opts.rev ?? '1', 2.0);
  veld(0, 3, 'Maten en toleranties', groot ? 'mm · stukken ISO 2768-m · gelast ISO 13920-BF · lassen ISO 5817-C' : 'mm · ISO 2768-m · gelast 13920-BF · 5817-C', groot ? 1.9 : 1.45); veld(k3 - (groot ? 6 : 4), 3, 'Schaal', opts.schaal ?? '', groot ? 2.1 : 1.8); veld(k3 + (groot ? 12 : 10), 3, 'Uitgifte', opts.datum || vandaag(), groot ? 2 : 1.7); veld(k4 + (groot ? 12 : 8), 3, 'Blad', opts.blad ?? '1 / 1', groot ? 2.1 : 1.8);
  return el.join('');
}

/**
 * lassymbool (ISO 2553, systeem A): pijllijn van p (de naad) naar de knik k, referentielijn met onderbroken lijn,
 * het symbool (hoeklas = driehoek, V-naad, I-naad), keel a, lengte, 'rondom' (cirkel) en 'op de werf' (vlag)
 */
export function lasSymbool(p, k, { soort = 'hoek', a = 3, rondom = false, beide = false, tekst = '', lengte = '', rechts = true, werf = false } = {}) {
  const el = [], r = rechts ? 1 : -1, ref = [k[0] + r * 22, k[1]];
  el.push(lijn(p[0], p[1], k[0], k[1], 0.25), pijl(p[0], p[1], (k[0] - p[0]) / Math.hypot(k[0] - p[0], k[1] - p[1]), (k[1] - p[1]) / Math.hypot(k[0] - p[0], k[1] - p[1])));
  el.push(lijn(k[0], k[1], ref[0], ref[1], 0.3), lijn(k[0], k[1] + 1.2, ref[0], ref[1] + 1.2, 0.2, '#111', '1.2 0.8'));
  const sx = k[0] + r * 8;
  const symbool = (y, onder) => {
    const z = onder ? 1 : -1;
    if (soort === 'hoek') return `<polygon points="${f(sx)},${f(y)} ${f(sx)},${f(y + z * 3)} ${f(sx + 3)},${f(y)}" fill="none" stroke="#111" stroke-width="0.3"/>`;
    if (soort === 'V') return `<polyline points="${f(sx - 1.6)},${f(y + z * 3)} ${f(sx)},${f(y)} ${f(sx + 1.6)},${f(y + z * 3)}" fill="none" stroke="#111" stroke-width="0.3"/>`;
    return `<line x1="${f(sx)}" y1="${f(y)}" x2="${f(sx)}" y2="${f(y + z * 3)}" stroke="#111" stroke-width="0.3"/><line x1="${f(sx + 1.2)}" y1="${f(y)}" x2="${f(sx + 1.2)}" y2="${f(y + z * 3)}" stroke="#111" stroke-width="0.3"/>`;
  };
  el.push(symbool(k[1], false));
  if (beide) el.push(symbool(k[1], true));
  if (soort === 'hoek') el.push(tk(sx - 1, k[1] - 0.8, `a${a}`, 2.2, { anker: 'end' }));
  if (lengte) el.push(tk(sx + 4, k[1] - 0.8, lengte, 2.2));
  if (soort === 'V') el.push(tk(sx + 2.6, k[1] - 0.8, 'vlak geslepen', 1.8));
  if (rondom) el.push(`<circle cx="${f(k[0])}" cy="${f(k[1])}" r="1.4" fill="none" stroke="#111" stroke-width="0.3"/>`);
  if (werf) el.push(`<polyline points="${f(k[0])},${f(k[1])} ${f(k[0])},${f(k[1] - 5)} ${f(k[0] + 3)},${f(k[1] - 4)} ${f(k[0])},${f(k[1] - 3)}" fill="#111" stroke="#111" stroke-width="0.25"/>`);
  if (tekst) el.push(tk(ref[0] + r * 1.5, k[1] + 0.8, tekst, 1.9, { anker: rechts ? 'start' : 'end' }));
  return el.join('');
}
