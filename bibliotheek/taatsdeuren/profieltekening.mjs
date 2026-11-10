// Werktekening per profiel (P1-P4) voor een extrudeur: de doorsnede groot op schaal met alle maten op A4 liggend, de
// eisen (legering, wand, afwerking, glas, toleranties) en een DXF van de contour (1:1, mm). NL en EN.
// Contouren = dezelfde profielen als STAAF.aanvraagP1..P4 (prijzen.mjs).
import { STAAF } from './prijzen.mjs';
import { maat } from './detail.mjs';
import { T, L, esc } from './blad.mjs';

const W4 = 297, H4 = 210, f = (v) => (Math.round(v * 100) / 100).toString();
const gN = (v, taal) => (taal === 'en' ? String(v) : String(v).replace('.', ','));

/** contouren in mm: v naar rechts (0 = buitenkant, glaskant rechts), z naar beneden (0 = voorkant) */
export const CONTOUR = {
  P1: { staaf: 'aanvraagP1', V: 30, D: 45, buiten: [[0, 0], [30, 0], [30, 16.3], [18, 16.3], [18, 28.7], [30, 28.7], [30, 45], [0, 45]], binnen: [[[1.8, 1.8], [28.2, 1.8], [28.2, 14.5], [16.2, 14.5], [16.2, 30.5], [28.2, 30.5], [28.2, 43.2], [1.8, 43.2]]], gaten: [] },
  P2: { staaf: 'aanvraagP2', V: 30, D: 45, buiten: [[0, 0], [30, 0], [30, 16.3], [18, 16.3], [18, 28.7], [30, 28.7], [30, 45], [0, 45], [0, 28.7], [12, 28.7], [12, 16.3], [0, 16.3]], binnen: [[[1.8, 1.8], [28.2, 1.8], [28.2, 14.5], [1.8, 14.5]], [[1.8, 30.5], [28.2, 30.5], [28.2, 43.2], [1.8, 43.2]]], gaten: [[15, 19.5, 1.9], [15, 25.5, 1.9]] },
  P3: { staaf: 'aanvraagP3', V: 40, D: 50, buiten: [[0, 0], [40, 0], [40, 50], [0, 50]], binnen: [[[2, 2], [38, 2], [38, 48], [2, 48]]], gaten: [] },
  P4: { staaf: 'aanvraagP4', V: 11, D: 12.4, buiten: [[0, 0], [11, 0], [11, 1.8], [2, 1.8], [2, 10.6], [11, 10.6], [11, 12.4], [0, 12.4]], binnen: [], gaten: [] },
};

const TXT = {
  nl: {
    titel: { P1: 'P1 vleugelprofiel (kader van de deur)', P2: 'P2 roede (H-profiel tussen twee ruiten)', P3: 'P3 kozijnprofiel', P4: 'P4 U-glasrubber' },
    doel: { P1: 'Kader van een taatsdeur in steel look; het glas zit in de gleuf aan de rechterkant (glaskant).', P2: 'Verdeling tussen twee ruiten; glas aan beide kanten in de gleuven; 2 schroefkanalen voor de bevestiging aan P1.', P3: 'Kozijn rond de deur (mag ook een standaardkoker 40 x 50 x 2 zijn).', P4: 'Rubber rond de rand van elke ruit, in de gleuf van P1 en P2.' },
    m: { zicht: 'zicht', diep: 'diepte', gleuf: 'glasgleuf', wand: 'wand', holte: 'holte voor hoekverbinder', kern: 'kern', kanaal: 'schroefkanaal 2 x Ø3,8', open: 'opening voor het glas', voor: 'voorkant (zichtzijde)', glas: 'glaskant' },
    eisen: (c, st) => c === 'P4'
      ? ['Materiaal: EPDM, Shore A 70 ± 5, zwart', 'Voor glas 8,0-8,8 mm (gelaagd 44.2 = 8,76 mm)', 'Past in een gleuf van 12,4 mm breed', 'Levering op rol (bv. 50 of 100 m)']
      : [`Legering: EN AW-6063 T5 of T6`, `Wanddikte: ${gN(st.wand, 'nl')} mm (min. ${gN(st.wand - 0.2, 'nl')} mm, niet dunner)`, 'Afwerking: zwart mat geanodiseerd (of poedercoat RAL 9005 mat)', 'Toleranties: EN 755-9', `Gewicht: ± ${gN(st.kgm, 'nl')} kg/m (berekend)`, 'Lengte: 6000 mm (of op lengte volgens bestelling)', ...(c === 'P1' || c === 'P2' ? ['Glas: gelaagd 44.2 = 8,76 mm (of gehard 8 mm) met U-rubber P4'] : [])],
    schaal: 'Schaal', maten: 'Maten in mm. Eerste hoekprojectie.', blad: 'Blad', eigen: 'Ian · laswerken, België',
  },
  en: {
    titel: { P1: 'P1 door leaf profile (door frame)', P2: 'P2 glazing bar (H profile between two panes)', P3: 'P3 door jamb profile', P4: 'P4 U glazing gasket' },
    doel: { P1: 'Frame of a steel-look pivot door; the glass sits in the channel on the right (glass side).', P2: 'Divider between two panes; glass on both sides in the channels; 2 screw ports to fix it to P1.', P3: 'Frame around the door (may also be a standard 40 x 50 x 2 tube).', P4: 'Gasket around the edge of each pane, inside the channel of P1 and P2.' },
    m: { zicht: 'face', diep: 'depth', gleuf: 'glass channel', wand: 'wall', holte: 'cavity for corner cleat', kern: 'core', kanaal: 'screw port 2 x Ø3.8', open: 'glass opening', voor: 'front (visible side)', glas: 'glass side' },
    eisen: (c, st) => c === 'P4'
      ? ['Material: EPDM, Shore A 70 ± 5, black', 'For glass 8.0-8.8 mm (44.2 laminated = 8.76 mm)', 'Fits a 12.4 mm wide channel', 'Supplied on rolls (e.g. 50 or 100 m)']
      : ['Alloy: EN AW-6063 T5 or T6', `Wall thickness: ${st.wand} mm (min. ${Math.round((st.wand - 0.2) * 10) / 10} mm, not thinner)`, 'Finish: matte black anodised (or powder coat RAL 9005 matte)', 'Tolerances: EN 755-9', `Weight: approx. ${st.kgm} kg/m (calculated)`, 'Length: 6000 mm (or cut to length as ordered)', ...(c === 'P1' || c === 'P2' ? ['Glass: 44.2 laminated = 8.76 mm (or 8 mm tempered) with U gasket P4'] : [])],
    schaal: 'Scale', maten: 'Dimensions in mm. First angle projection.', blad: 'Sheet', eigen: 'Ian · laswerken, Belgium',
  },
};

const pad = (pts, x, y, s) => pts.map(([v, z], i) => `${i ? 'L' : 'M'}${f(x + v * s)},${f(y + z * s)}`).join(' ') + ' Z';

/** het blad A4 liggend van één profiel */
export function profielBlad(code, taal = 'en', nr = 1, n = 4) {
  const t = TXT[taal], c = CONTOUR[code], st = STAAF[c.staaf], el = [];
  const s = code === 'P4' ? 7 : code === 'P3' ? 2.2 : 2.5, x = 62, y = 50 + (125 - c.D * s) / 2;
  const g = (v) => gN(v, taal);
  el.push(`<rect x="10" y="10" width="${W4 - 20}" height="${H4 - 20}" fill="none" stroke="#111" stroke-width="0.6"/>`);
  el.push(T(16, 20, t.titel[code], 5, { vet: true }), T(16, 26.5, t.doel[code], 2.6, { kleur: '#333' }), T(16, 31.5, `${t.maten} ${t.schaal} ${s}:1 (A4).`, 2.3, { kleur: '#555' }));
  // de doorsnede: buitencontour met de holtes (evenodd), gearceerd zwart
  el.push(`<path d="${pad(c.buiten, x, y, s)} ${c.binnen.map((b) => pad(b, x, y, s)).join(' ')}" fill="#2b2f33" fill-rule="evenodd" stroke="#111" stroke-width="0.3"/>`);
  for (const [gv, gz, r] of c.gaten) el.push(`<circle cx="${f(x + gv * s)}" cy="${f(y + gz * s)}" r="${f(r * s)}" fill="#fff" stroke="#111" stroke-width="0.25"/>`);
  // hartlijnen
  el.push(`<line x1="${f(x - 6)}" y1="${f(y + (c.D / 2) * s)}" x2="${f(x + c.V * s + 6)}" y2="${f(y + (c.D / 2) * s)}" stroke="#111" stroke-width="0.15" stroke-dasharray="6 1 1 1"/>`);
  // maten
  el.push(maat(x, y + c.D * s, x + c.V * s, y + c.D * s, -9, `${t.m.zicht} ${g(c.V)}`, 3), maat(x, y, x, y + c.D * s, -9, `${t.m.diep} ${g(c.D)}`, 3));
  el.push(T(x + (c.V * s) / 2, y - 17, t.m.voor, 2.4, { anker: 'middle', kleur: '#555' }));
  if (code === 'P1') {
    el.push(maat(x + 18 * s, y, x + 30 * s, y, 8, g(12), 3), maat(x + 30 * s, y + 16.3 * s, x + 30 * s, y + 28.7 * s, 9, `${t.m.gleuf} ${g(12.4)}`, 3), maat(x + 30 * s, y, x + 30 * s, y + 16.3 * s, 24, g(16.3), 3));
    el.push(maat(x, y + c.D * s, x + 1.8 * s, y + c.D * s, -17, `${t.m.wand} ${g(1.8)}`, 2.6), maat(x + 16.2 * s, y + c.D * s, x + 18 * s, y + c.D * s, -17, g(1.8), 2.6));
    el.push(`<rect x="${f(x + 1.8 * s)}" y="${f(y + 1.8 * s)}" width="${f(14.4 * s)}" height="${f(41.4 * s)}" fill="none" stroke="#3b8fe0" stroke-width="0.35" stroke-dasharray="2 1"/>`, T(x + 9 * s, y + 22.5 * s - 2, t.m.holte, 2.4, { anker: 'middle', kleur: '#3b8fe0' }), T(x + 9 * s, y + 22.5 * s + 2.5, `${g(14.4)} x ${g(41.4)}`, 2.6, { anker: 'middle', kleur: '#3b8fe0', vet: true }));
    el.push(T(x + 30 * s + 4, y + c.D * s + 6, t.m.glas, 2.4, { kleur: '#555' }));
  } else if (code === 'P2') {
    el.push(maat(x, y, x + 12 * s, y, 8, g(12), 3), maat(x + 12 * s, y, x + 18 * s, y, 8, g(6), 3), maat(x + 18 * s, y, x + 30 * s, y, 8, g(12), 3));
    el.push(maat(x + 30 * s, y + 16.3 * s, x + 30 * s, y + 28.7 * s, 9, `${t.m.gleuf} ${g(12.4)}`, 3), maat(x + 30 * s, y, x + 30 * s, y + 16.3 * s, 24, g(16.3), 3));
    el.push(maat(x, y, x, y + 19.5 * s, -21, g(19.5), 3), maat(x, y + 19.5 * s, x, y + 25.5 * s, -21, g(6), 3));
    el.push(L(x + 15 * s + 2, y + 25.5 * s + 2, x + 30 * s + 14, y + 36 * s, 0.2), T(x + 30 * s + 15, y + 36 * s + 1, t.m.kanaal, 2.6), T(x + 30 * s + 15, y + 36 * s + 5, `${t.m.kern} ${g(6)}`, 2.6));
    el.push(maat(x, y + c.D * s, x + 1.8 * s, y + c.D * s, -17, `${t.m.wand} ${g(1.8)}`, 2.6));
  } else if (code === 'P3') {
    el.push(maat(x, y + c.D * s, x + 2 * s, y + c.D * s, -17, `${t.m.wand} ${g(2)}`, 2.6));
  } else {
    el.push(maat(x + 11 * s, y + 1.8 * s, x + 11 * s, y + 10.6 * s, 10, `${t.m.open} ${g(8.8)}`, 3), maat(x, y, x + 2 * s, y, 8, g(2), 3), maat(x + 11 * s, y, x + 11 * s, y + 1.8 * s, 30, g(1.8), 3));
  }
  // rechts: de eisen
  const ex = 182;
  el.push(`<rect x="${ex}" y="34" width="${W4 - 10 - 6 - ex}" height="${8 + t.eisen(code, st).length * 7}" fill="#f4f5f6" stroke="#111" stroke-width="0.3"/>`);
  t.eisen(code, st).forEach((r, i) => { const w = r.split(' '), l1 = [''], max = 48; for (const x2 of w) { if ((l1.at(-1) + ' ' + x2).length > max) l1.push(x2); else l1[l1.length - 1] += (l1.at(-1) ? ' ' : '') + x2; } l1.slice(0, 2).forEach((q, j) => el.push(T(ex + 3, 41 + i * 7 + j * 3.2, q, 2.5, { vet: j === 0 && i === 0 && false }))); });
  // titelblok
  const tx = W4 - 10 - 110, ty = H4 - 10 - 18;
  el.push(`<rect x="${tx}" y="${ty}" width="110" height="18" fill="#fff" stroke="#111" stroke-width="0.4"/>`, L(tx, ty + 9, tx + 110, ty + 9, 0.2), L(tx + 70, ty + 9, tx + 70, ty + 18, 0.2), L(tx + 90, ty + 9, tx + 90, ty + 18, 0.2));
  el.push(T(tx + 2, ty + 6, `${code} · ${t.eigen}`, 2.8, { vet: true }), T(tx + 2, ty + 15, '2026-11-10', 2.4), T(tx + 72, ty + 15, `${t.schaal} ${s}:1`, 2.4), T(tx + 92, ty + 15, `${t.blad} ${nr}/${n}`, 2.4));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W4} ${H4}" width="${W4}mm" height="${H4}mm" font-family="Arial, Helvetica, sans-serif"><rect width="${W4}" height="${H4}" fill="#fff"/>${el.join('\n')}</svg>`;
}

/** DXF (R12, mm, 1:1) van de contour: buitencontour, holtes, schroefkanalen en de maten als tekst */
export function profielDxf(code, schrijver) {
  const c = CONTOUR[code], w = schrijver(), Z = (p) => [p[0], -p[1]];
  w.veelhoek(c.buiten.map(Z), 'CONTOUR');
  for (const b of c.binnen) w.veelhoek(b.map(Z), 'CONTOUR');
  for (const [gv, gz, r] of c.gaten) w.cirkel([gv, -gz], r, 'CONTOUR');
  w.tekst([0, -c.D - 6], 2.5, `${code}  ${c.V} x ${c.D} mm  (v = face, z = depth; glass side right)`);
  w.tekst([0, -c.D - 10], 2.5, `${STAAF[c.staaf].naam.replace(/[^\x20-\x7e]/g, '')}`);
  return w.tekst2();
}
export { esc };
