// Tekenhulpjes voor aansluitschema's in EPLAN-stijl (A3 liggend, kolommen 1-8, rijen A-F, titelblok, IEC 60617-symbolen).
// Gebruikt door voorbeelden/treinverlichting/schema/maak-schema.mjs (de afzuiging heeft haar eigen, oudere kopie).
export const W = 420, H = 297; // A3 liggend, mm
export const X0 = 20, X1 = 410, Y0 = 12, Y1 = 250; // tekenvlak
export const KOL = (X1 - X0) / 8;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const T = (x, y, s, { size = 3, anchor = 'start', bold = false, kleur = '#111', hoek = 0 } = {}) =>
  `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" fill="${kleur}"${bold ? ' font-weight="700"' : ''}${hoek ? ` transform="rotate(${hoek} ${x} ${y})"` : ''}>${esc(s)}</text>`;
export const L = (pts, { w = 0.35, kleur = '#111', streep = '' } = {}) =>
  `<polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${kleur}" stroke-width="${w}"${streep ? ` stroke-dasharray="${streep}"` : ''}/>`;
export const punt = (x, y) => `<circle cx="${x}" cy="${y}" r="0.8" fill="#111"/>`;
export const rect = (x, y, w, h, { streep = '', w2 = 0.35, vul = 'none' } = {}) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${vul}" stroke="#111" stroke-width="${w2}"${streep ? ` stroke-dasharray="${streep}"` : ''}/>`;
/** weerstand verticaal van (x, y) naar (x, y + 20) */
export const weerstand = (x, y, code, waarde) => [L([[x, y], [x, y + 6]]), rect(x - 1.5, y + 6, 3, 8), L([[x, y + 14], [x, y + 20]]), T(x - 3, y + 9, code, { anchor: 'end', size: 2.4 }), T(x - 3, y + 12.5, waarde, { anchor: 'end', size: 2.2, kleur: '#444' })].join('');
/** condensator verticaal van (x, y) naar (x, y + 16) */
export const condensator = (x, y, code, waarde) => [L([[x, y], [x, y + 7]]), L([[x - 3.5, y + 7], [x + 3.5, y + 7]], { w: 0.6 }), L([[x - 3.5, y + 9], [x + 3.5, y + 9]], { w: 0.6 }), L([[x, y + 9], [x, y + 16]]), T(x + 5, y + 7.5, code, { size: 2.6 }), T(x + 5, y + 11, waarde, { size: 2.4, kleur: '#444' })].join('');
/** zekering horizontaal van (x, y) naar (x + 20, y) */
export const zekering = (x, y, code, waarde) => [L([[x, y], [x + 5, y]]), rect(x + 5, y - 2, 10, 4), L([[x + 5, y], [x + 15, y]], { w: 0.25 }), L([[x + 15, y], [x + 20, y]]), T(x + 10, y - 3.5, code, { anchor: 'middle', size: 2.6 }), T(x + 10, y + 6, waarde, { anchor: 'middle', size: 2.4, kleur: '#444' })].join('');
/** polyfuse (PTC) verticaal van (x, y) naar (x, y + 20): rechthoek met schuine streep */
export const ptc = (x, y, code, waarde) => [L([[x, y], [x, y + 6]]), rect(x - 2, y + 6, 4, 8), L([[x - 3.5, y + 15], [x + 3.5, y + 5], [x + 5, y + 5]], { w: 0.3 }), L([[x, y + 14], [x, y + 20]]), T(x + 6, y + 9, code, { size: 2.4 }), T(x + 6, y + 12.5, waarde, { size: 2.2, kleur: '#444' })].join('');
/** klem: rondje met nummer */
export const klem = (x, y, code, nr) => `<circle cx="${x}" cy="${y}" r="1.3" fill="#fff" stroke="#111" stroke-width="0.35"/>${T(x + 2.2, y - 1.6, `${code}:${nr}`, { size: 2.0, kleur: '#333' })}`;
/** N-MOSFET verticaal: gate links (x - 9, y), drain boven (x + 2, y - 9), source onder (x + 2, y + 9) */
export const nmos = (x, y, code, type) => [
  `<circle cx="${x}" cy="${y}" r="6.5" fill="none" stroke="#111" stroke-width="0.35"/>`,
  L([[x - 9, y], [x - 3.5, y]]), L([[x - 3.5, y - 3.5], [x - 3.5, y + 3.5]], { w: 0.5 }),
  L([[x - 2, y - 4], [x - 2, y - 2]], { w: 0.5 }), L([[x - 2, y - 1], [x - 2, y + 1]], { w: 0.5 }), L([[x - 2, y + 2], [x - 2, y + 4]], { w: 0.5 }),
  L([[x - 2, y - 3], [x + 2, y - 3], [x + 2, y - 9]]), L([[x - 2, y + 3], [x + 2, y + 3], [x + 2, y + 9]]), L([[x - 2, y], [x + 2, y], [x + 2, y + 3]]),
  `<polygon points="${x - 2},${y} ${x - 0.2},${y - 1} ${x - 0.2},${y + 1}" fill="#111"/>`,
  T(x + 4, y - 7.5, code, { size: 2.4, bold: true }), type ? T(x + 4, y + 11.5, type, { size: 2.0, kleur: '#444' }) : '',
].join('');
/** optocoupler: led links (anode boven (x - 4, y - 8), kathode onder (x - 4, y + 8)), transistor rechts (collector (x + 5, y - 8), emitter (x + 5, y + 8)) */
export const opto = (x, y, code) => [
  rect(x - 8, y - 6, 16, 12, { streep: '1.5 1', w2: 0.25 }),
  L([[x - 4, y - 8], [x - 4, y - 2.5]]), `<polygon points="${x - 6},${y - 2.5} ${x - 2},${y - 2.5} ${x - 4},${y + 1}" fill="none" stroke="#111" stroke-width="0.35"/>`, L([[x - 6, y + 1], [x - 2, y + 1]]), L([[x - 4, y + 1], [x - 4, y + 8]]),
  L([[x - 1, y - 1.5], [x + 1, y - 0.5]], { w: 0.25 }), L([[x - 1, y + 0.5], [x + 1, y + 1.5]], { w: 0.25 }),
  L([[x + 2.5, y - 3], [x + 2.5, y + 3]], { w: 0.5 }), L([[x + 2.5, y - 1.5], [x + 5, y - 4], [x + 5, y - 8]]), L([[x + 2.5, y + 1.5], [x + 5, y + 4], [x + 5, y + 8]]),
  T(x - 9, y - 7, code, { size: 2.2, bold: true, anchor: 'end' }),
].join('');
/** toestel als gestreepte kader met aansluitingen; pins: [{ x, y, naam }] relatief */
export const toestel = (x, y, w, h, code, regels, pins = []) => [
  rect(x, y, w, h, { streep: '2 1.2', vul: '#fbfaf7' }), T(x + 2, y - 2, code, { size: 3.2, bold: true }),
  ...regels.map((r, i) => T(x + 2.5, y + 5 + i * 3.6, r, { size: 2.5, kleur: '#333' })),
  ...pins.map((p) => `<circle cx="${x + p.x}" cy="${y + p.y}" r="0.9" fill="#111"/>${T(x + p.x + (p.x < w / 2 ? 2 : -2), y + p.y + (p.y < h / 2 ? 4 : -2), p.naam, { size: 2.2, anchor: p.x < w / 2 ? 'start' : 'end', kleur: '#222' })}`),
].join('');
/** potentiaalrail met naam en kruisverwijzingen */
export const rail = (y, xa, xb, naam, links, rechts, kleur = '#b42318') => [
  L([[xa, y], [xb, y]], { w: 0.5, kleur }), T(xa, y - 1.5, links ? `${naam}  ← ${links}` : naam, { size: 2.6, kleur }), rechts ? T(xb, y - 1.5, `${naam}  → ${rechts}`, { size: 2.6, anchor: 'end', kleur }) : '',
].join('');
/** tabel (klemmenplan, stuklijst) */
export function tabel(x, y, kolommen, rijen, h = 7) {
  const r = [];
  let cx = x;
  kolommen.forEach(([kop, w]) => { r.push(rect(cx, y, w, h, { vul: '#efece6' }), T(cx + 2, y + h * 0.68, kop, { size: 2.8, bold: true })); cx += w; });
  rijen.forEach((rij, j) => {
    let xx = x;
    rij.forEach((cel, k) => { r.push(rect(xx, y + h * (j + 1), kolommen[k][1], h), T(xx + 2, y + h * (j + 1) + h * 0.68, cel, { size: h > 6 ? 2.6 : 2.3 })); xx += kolommen[k][1]; });
  });
  return r.join('');
}
/** kader met kolommen, rijen en titelblok; project = { naam, onder, plaats, plaatsOnder, versie, datum, bladen } */
export function kader(nr, titel, inhoud, project) {
  const k = [];
  k.push(rect(5, 5, W - 10, H - 10, { w2: 0.7 }), rect(X0 - 5, Y0 - 5, X1 - X0 + 5, Y1 - Y0 + 5, { w2: 0.25 }));
  for (let i = 1; i <= 8; i++) {
    const x = X0 + KOL * (i - 1);
    k.push(L([[x, 5], [x, Y0 - 5]], { w: 0.25 }), T(x + KOL / 2, 9.5, String(i), { anchor: 'middle', size: 3 }));
  }
  'ABCDEF'.split('').forEach((r, i) => {
    const y = Y0 + ((Y1 - Y0) / 6) * i;
    k.push(L([[5, y], [X0 - 5, y]], { w: 0.25 }), T(10, y + (Y1 - Y0) / 12 + 1, r, { anchor: 'middle', size: 3 }));
  });
  const ty = Y1 + 3;
  k.push(rect(X0 - 5, ty, X1 - X0 + 5, H - 5 - ty, { w2: 0.5 }));
  const vak = (x, kop, waarde, groot = false) => [L([[x, ty], [x, H - 5]], { w: 0.25 }), T(x + 2, ty + 5, kop, { size: 2.2, kleur: '#666' }), T(x + 2, ty + (groot ? 16 : 13), waarde, { size: groot ? 5.5 : 3.2, bold: groot })].join('');
  k.push(vak(X0 - 5, 'Project', project.naam), T(X0 - 3, ty + 20, `${project.onder}, versie ${project.versie}`, { size: 2.4, kleur: '#444' }));
  k.push(vak(X0 + 65, 'Bladtitel', titel, true));
  k.push(vak(X0 + 185, 'Installatie / plaats', project.plaats), T(X0 + 187, ty + 20, project.plaatsOnder, { size: 2.4, kleur: '#444' }));
  k.push(vak(X0 + 245, 'Norm', 'IEC 81346 / 60617'), T(X0 + 247, ty + 20, 'EPLAN-stijl', { size: 2.4, kleur: '#444' }));
  k.push(vak(X0 + 295, 'Datum / getekend', project.datum), T(X0 + 297, ty + 20, 'Phlippo CAD', { size: 2.4, kleur: '#444' }));
  k.push(vak(X0 + 345, 'Blad', `${nr} / ${project.bladen}`, true));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}mm" height="${H}mm" font-family="Arial, Helvetica, sans-serif">
<rect width="${W}" height="${H}" fill="#fff"/>
${k.join('\n')}
${inhoud.join('\n')}
</svg>`;
}
