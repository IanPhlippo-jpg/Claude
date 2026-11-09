// Opschriften op de robot (decals): typenaam op de bovenarm, de asnummers met draairichting, waarschuwingen volgens
// ISO 7010 (W001 algemeen gevaar, W024 knelgevaar voor handen) en het typeplaatje (EN ISO 10218-1: fabrikant, type,
// serienummer, bouwjaar, massa, draagvermogen, CE). Eigen naam: geen merk van een bestaande robotfabrikant.
import { Plaat } from '../lib/printplaat.mjs';

const ZWART = '#16181a', WIT = '#f4f4f0';
/** losse tekst zonder achtergrond */
function tekst(w, h, regels, { kleur = ZWART, ppm = 4 } = {}) {
  const p = new Plaat(w, h, { masker: 'geen', ppm });
  for (const [x, y, t, o = {}] of regels) p.tekst(x, y, t, { kleur, ...o });
  return p;
}
/** de typenaam langs de bovenarm (beide zijden) */
export function typenaam(a2, b) {
  const p = tekst(900, 150, [[450, 62, 'PR 120 R2700', { h: 70, vet: true }], [450, 128, '6-AXIS INDUSTRIAL ROBOT', { h: 22 }]]);
  return [
    p.decal('dc1', 'Typenaam rechts', [0, a2 / 2, b / 2], { normaal: [0, 0, 1], draai: 90 }),
    p.decal('dc2', 'Typenaam links', [0, a2 / 2, -b / 2], { normaal: [0, 0, -1], draai: -90 }),
  ];
}
/** asnummer met een gebogen pijl voor de draairichting (+), Ø diameter in mm */
export function asLabel(naam, d = 110, kleur = ZWART) {
  const p = new Plaat(d, d, { masker: 'geen', ppm: 6 }), c = d / 2, r = d * 0.42;
  const pijl = `<path d="M ${c + r} ${c} A ${r} ${r} 0 1 1 ${c} ${c - r}" fill="none" stroke="${kleur}" stroke-width="${d * 0.05}"/>`
    + `<path d="M ${c - d * 0.09} ${c - r - d * 0.08} L ${c + d * 0.06} ${c - r} L ${c - d * 0.09} ${c - r + d * 0.08} Z" fill="${kleur}"/>`;
  p.eigen(pijl);
  p.tekst(c, c + d * 0.02, naam, { h: d * 0.26, vet: true, kleur });
  return p;
}
/** ISO 7010 waarschuwing: gele driehoek met zwarte rand; W001 (!) of W024 (hand tussen rollen, vereenvoudigd) */
export function waarschuwing(soort = 'W001', d = 90) {
  const p = new Plaat(d, d * 0.9, { masker: 'geen', ppm: 6 }), h = d * 0.866, y0 = (d * 0.9 - h) / 2;
  p.eigen(`<path d="M ${d / 2} ${y0} L ${d} ${y0 + h} L 0 ${y0 + h} Z" fill="${ZWART}"/><path d="M ${d / 2} ${y0 + d * 0.12} L ${d - d * 0.1} ${y0 + h - d * 0.05} L ${d * 0.1} ${y0 + h - d * 0.05} Z" fill="#f9c80e"/>`);
  if (soort === 'W001') p.eigen(`<rect x="${d / 2 - d * 0.04}" y="${y0 + h * 0.36}" width="${d * 0.08}" height="${h * 0.32}" rx="${d * 0.03}" fill="${ZWART}"/><circle cx="${d / 2}" cy="${y0 + h * 0.8}" r="${d * 0.05}" fill="${ZWART}"/>`);
  else p.eigen(`<circle cx="${d * 0.42}" cy="${y0 + h * 0.72}" r="${d * 0.12}" fill="none" stroke="${ZWART}" stroke-width="${d * 0.03}"/><circle cx="${d * 0.62}" cy="${y0 + h * 0.72}" r="${d * 0.12}" fill="none" stroke="${ZWART}" stroke-width="${d * 0.03}"/><path d="M ${d * 0.38} ${y0 + h * 0.4} l ${d * 0.14} ${h * 0.2} l ${d * 0.05} ${-h * 0.06}" stroke="${ZWART}" stroke-width="${d * 0.05}" fill="none" stroke-linecap="round"/>`);
  return p;
}
/** typeplaatje (aluminium, gegraveerd) volgens EN ISO 10218-1 */
export function typeplaat() {
  const p = new Plaat(160, 90, { masker: 'geen', ppm: 8 });
  p.eigen(`<rect x="0" y="0" width="160" height="90" rx="5" fill="#c9ccd0"/><rect x="4" y="4" width="152" height="82" rx="3" fill="none" stroke="${ZWART}" stroke-width="0.8"/>`);
  const r = [['Type', 'PR 120 R2700'], ['Serienr.', '0001'], ['Bouwjaar', '2026'], ['Massa', '1050 kg'], ['Draagvermogen', '120 kg'], ['Bereik', '2700 mm (polsmidden)'], ['Voeding', '3 x 400 V, 50 Hz, 16 A']];
  r.forEach(([k, v], i) => { p.tekst(10, 14 + i * 10, k, { h: 6, anker: 'start', kleur: ZWART }); p.tekst(62, 14 + i * 10, v, { h: 6, anker: 'start', kleur: ZWART, vet: true }); });
  p.tekst(140, 76, 'CE', { h: 14, vet: true, kleur: ZWART });
  return p;
}
export { WIT, ZWART };
