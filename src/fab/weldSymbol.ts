/**
 * The weld symbol after ISO 2553 system A (docs/36 3.5, L3.3, docs/37 B-14), drawn as lines (Helvetica has no glyph for
 * it): an arrow line, the solid reference line and, for a weld that is not symmetric, the dashed identification line;
 * the elementary symbol on the solid line (arrow side) or on the dashed line (other side), both for a two-sided weld;
 * the size with its letter (a or z) on the left, the length or n x l (e) on the right; a circle at the knee for all
 * around, a flag for a field weld; the tail with process / position / quality level.
 */
import type { PdfPage } from './pdf';
import type { WeldJoint } from './types';

export interface WeldSymbolSpec extends Pick<WeldJoint, 'soort' | 'maat' | 'lengte' | 'tweezijdig' | 'rondom' | 'montage' | 'onderbroken' | 'proces' | 'positie' | 'niveau'> {
  /** the weld is on the other side of the arrow */
  tegenzijde?: boolean;
}

type Seg = { a: [number, number]; b: [number, number]; dash?: boolean };
interface Prims { segs: Seg[]; circles: { c: [number, number]; r: number }[]; texts: { p: [number, number]; s: string; align: 'left' | 'right' | 'center'; size: number }[] }

const g = (x: number) => String(x).replace('.', ',');

/** the primitives of one symbol, in mm, the knee of arrow and reference line at (0, 0), y down */
export function weldSymbolPrims(j: WeldSymbolSpec, lenRef = 34): Prims {
  const segs: Seg[] = [], circles: Prims['circles'] = [], texts: Prims['texts'] = [];
  // arrow line down-left to the joint, with its arrow head
  segs.push({ a: [0, 0], b: [-9, 9] }, { a: [-9, 9], b: [-6.2, 8.3] }, { a: [-9, 9], b: [-8.3, 6.2] });
  segs.push({ a: [0, 0], b: [lenRef, 0] });
  const symmetric = j.tweezijdig || j.soort === 'X';
  if (!symmetric) segs.push({ a: [0, 1.6], b: [lenRef, 1.6], dash: true });
  const sx = 12; // the symbol sits here
  const elem = (below: boolean) => {
    // below = on the other side (under the reference line, mirrored)
    const s = below ? -1 : 1, y0 = below ? (symmetric ? 0 : 1.6) : 0;
    const Y = (dy: number) => y0 - s * dy;
    if (j.soort === 'hoeklas') segs.push({ a: [sx, Y(0)], b: [sx, Y(4)] }, { a: [sx, Y(4)], b: [sx + 4, Y(0)] });
    else if (j.soort === 'I') segs.push({ a: [sx, Y(0)], b: [sx, Y(4)] }, { a: [sx + 2, Y(0)], b: [sx + 2, Y(4)] });
    else if (j.soort === 'V' || j.soort === 'X') segs.push({ a: [sx - 2.5, Y(4)], b: [sx, Y(0)] }, { a: [sx, Y(0)], b: [sx + 2.5, Y(4)] });
    else if (j.soort === 'HV') segs.push({ a: [sx, Y(0)], b: [sx, Y(4)] }, { a: [sx, Y(0)], b: [sx + 3, Y(4)] });
    else if (j.soort === 'Y') segs.push({ a: [sx - 2.5, Y(4)], b: [sx, Y(1.5)] }, { a: [sx, Y(1.5)], b: [sx + 2.5, Y(4)] }, { a: [sx, Y(0)], b: [sx, Y(1.5)] });
    else circles.push({ c: [sx, Y(2)], r: 2 });
    const size = `${j.maat.letter}${g(j.maat.mm)}`;
    const len = j.onderbroken ? `${j.onderbroken.n} x ${g(j.onderbroken.l)} (${g(j.onderbroken.e)})` : g(Math.round(j.lengte));
    const left = sx - (j.soort === 'V' || j.soort === 'X' || j.soort === 'Y' ? 3.5 : j.soort === 'hoeklas' || j.soort === 'I' || j.soort === 'HV' ? 1.5 : 2.8);
    texts.push({ p: [left, Y(1.2) + (below ? 2.6 : 0)], s: size, align: 'right', size: 7 }, { p: [sx + 5.5, Y(1.2) + (below ? 2.6 : 0)], s: len, align: 'left', size: 7 });
  };
  const arrowSide = j.tweezijdig || j.soort === 'X' || !j.tegenzijde;
  const otherSide = j.tweezijdig || j.soort === 'X' || !!j.tegenzijde;
  if (arrowSide) elem(false);
  if (otherSide) elem(true);
  if (j.rondom) circles.push({ c: [0, 0], r: 1.6 });
  if (j.montage) segs.push({ a: [0, 0], b: [0, -6] }, { a: [0, -6], b: [4, -5] }, { a: [4, -5], b: [0, -4] });
  // the tail: a fork with process / position / quality level
  segs.push({ a: [lenRef, 0], b: [lenRef + 3, -3] }, { a: [lenRef, 0], b: [lenRef + 3, 3] });
  texts.push({ p: [lenRef + 4, 1], s: `${j.proces}/${j.positie}/${j.niveau}`, align: 'left', size: 6.5 });
  return { segs, circles, texts };
}

/** draws the symbol on a PDF page with the knee at (x, y) */
export function drawWeldSymbol(p: PdfPage, x: number, y: number, j: WeldSymbolSpec, scale = 1) {
  const pr = weldSymbolPrims(j);
  for (const s of pr.segs) p.line(x + s.a[0] * scale, y + s.a[1] * scale, x + s.b[0] * scale, y + s.b[1] * scale, { w: 0.25, ...(s.dash ? { dash: [1.2, 0.8] } : {}) });
  for (const c of pr.circles) p.circle(x + c.c[0] * scale, y + c.c[1] * scale, c.r * scale, { stroke: [0, 0, 0], w: 0.25 });
  for (const t of pr.texts) p.text(x + t.p[0] * scale, y + t.p[1] * scale, t.s, { size: t.size * scale, align: t.align });
}

/** the symbol as SVG (the Weld Joint panel and the review sheet of 8 symbols) */
export function weldSymbolSvg(j: WeldSymbolSpec): string {
  const pr = weldSymbolPrims(j);
  const k = 4;
  const els = [
    ...pr.segs.map((s) => `<line x1="${(s.a[0] + 12) * k}" y1="${(s.a[1] + 10) * k}" x2="${(s.b[0] + 12) * k}" y2="${(s.b[1] + 10) * k}" stroke="#000"` +
      ` stroke-width="1"${s.dash ? ' stroke-dasharray="5 3"' : ''}/>`),
    ...pr.circles.map((c) => `<circle cx="${(c.c[0] + 12) * k}" cy="${(c.c[1] + 10) * k}" r="${c.r * k}" fill="none" stroke="#000" stroke-width="1"/>`),
    ...pr.texts.map((t) => `<text x="${(t.p[0] + 12) * k}" y="${(t.p[1] + 10) * k}" font-family="Helvetica, Arial" font-size="${t.size * 3.5}"` +
      ` text-anchor="${t.align === 'right' ? 'end' : t.align === 'center' ? 'middle' : 'start'}">${t.s}</text>`),
  ];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${78 * k} ${22 * k}" width="${78 * k}" height="${22 * k}">${els.join('')}</svg>`;
}

/** the eight examples of L3.3: arrow side, other side, both sides, all around, field weld, intermittent, V, with tail */
export const SYMBOL_EXAMPLES: { naam: string; j: WeldSymbolSpec }[] = (() => {
  const base: WeldSymbolSpec = { soort: 'hoeklas', maat: { letter: 'a', mm: 4 }, lengte: 120, tweezijdig: false, rondom: false, montage: false, onderbroken: null, proces: '135',
    positie: 'PB', niveau: 'C' };
  return [
    { naam: 'hoeklas pijlzijde', j: base },
    { naam: 'hoeklas tegenzijde', j: { ...base, tegenzijde: true } },
    { naam: 'hoeklas tweezijdig', j: { ...base, tweezijdig: true } },
    { naam: 'rondom', j: { ...base, rondom: true, lengte: 150 } },
    { naam: 'montagelas', j: { ...base, montage: true } },
    { naam: 'onderbroken', j: { ...base, onderbroken: { n: 3, l: 50, e: 100 } } },
    { naam: 'V-naad', j: { ...base, soort: 'V', maat: { letter: 's', mm: 5 } } },
    { naam: 'met staart 141/PF/B', j: { ...base, maat: { letter: 'z', mm: 6 }, proces: '141', positie: 'PF', niveau: 'B' } },
  ];
})();
