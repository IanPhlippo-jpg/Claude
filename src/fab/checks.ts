/**
 * The checks before a laser export (docs/36 P-4): contour closed, no self-intersection, no double lines (these three
 * block the export), holes smaller than the thickness, webs between two cut-outs narrower than the thickness, holes too
 * close to a bend line (reported). Each finding names its kind, so a test can tell them apart.
 */
import type { FlatPart, Loop } from './flat';
import { arcPoints } from './flat';
import { minRect, type P2 } from './geom';

export type CheckKind = 'open' | 'zelfdoorsnijding' | 'dubbel' | 'klein gat' | 'smalle steg' | 'gat bij plooi';
export interface Finding { soort: CheckKind; tekst: string; blokkeert: boolean }

const BLOCKS: Record<CheckKind, boolean> = { open: true, zelfdoorsnijding: true, dubbel: true, 'klein gat': false, 'smalle steg': false, 'gat bij plooi': false };

/** the loop as a polygon (arcs sampled) */
export function loopPolygon(l: Loop, perArc = 12): P2[] {
  const out: P2[] = [];
  l.forEach((s, i) => { if (!s.bulge) out.push(s.a); else out.push(...arcPoints(s.a, l[(i + 1) % l.length].a, s.bulge, perArc).slice(0, -1)); });
  return out;
}

const segX = (a: P2, b: P2, c: P2, d: P2) => {
  const o = (p: P2, q: P2, r: P2) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const d1 = o(a, b, c), d2 = o(a, b, d), d3 = o(c, d, a), d4 = o(c, d, b);
  return ((d1 > 1e-9 && d2 < -1e-9) || (d1 < -1e-9 && d2 > 1e-9)) && ((d3 > 1e-9 && d4 < -1e-9) || (d3 < -1e-9 && d4 > 1e-9));
};

function selfIntersects(poly: P2[]): boolean {
  const n = poly.length;
  for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) {
    if (i === 0 && j === n - 1) continue;
    if (segX(poly[i], poly[(i + 1) % n], poly[j], poly[(j + 1) % n])) return true;
  }
  return false;
}

const segKey = (a: P2, b: P2) => { const k = (p: P2) => `${Math.round(p.x * 1000)},${Math.round(p.y * 1000)}`; const [x, y] = [k(a), k(b)].sort(); return `${x}|${y}`; };

function distPointSeg(p: P2, a: P2, b: P2): number {
  const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)) : 0;
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}
/** the smallest distance between two polygons (vertices against edges both ways) */
export function polyDistance(a: P2[], b: P2[]): number {
  let d = Infinity;
  for (const p of a) for (let i = 0; i < b.length; i++) d = Math.min(d, distPointSeg(p, b[i], b[(i + 1) % b.length]));
  for (const p of b) for (let i = 0; i < a.length; i++) d = Math.min(d, distPointSeg(p, a[i], a[(i + 1) % a.length]));
  return d;
}

export interface CheckInput extends Pick<FlatPart, 'buiten' | 'binnen' | 'gaten' | 'plooien' | 't'> {
  /** loose ends of contours that did not close (an imported or hand-made outline) */
  openEinden?: number;
}

export function plateChecks(p: CheckInput, bendDistance = 2 * p.t): Finding[] {
  const out: Finding[] = [];
  const add = (soort: CheckKind, tekst: string) => out.push({ soort, tekst, blokkeert: BLOCKS[soort] });
  if (p.openEinden) add('open', `${p.openEinden} open einde${p.openEinden === 1 ? '' : 'n'}: de contour is niet gesloten`);
  const loops = [p.buiten, ...p.binnen];
  loops.forEach((l, i) => { if (selfIntersects(loopPolygon(l, 6))) add('zelfdoorsnijding', `${i === 0 ? 'buitencontour' : `binnencontour ${i}`} snijdt zichzelf`); });
  const seen = new Map<string, number>();
  let dubbel = 0;
  for (const l of loops) l.forEach((s, i) => { const k = segKey(s.a, l[(i + 1) % l.length].a) + `|${Math.round(Math.abs(s.bulge) * 1e4)}`; if (seen.has(k)) dubbel++; seen.set(k, 1); });
  const circ = new Set<string>();
  for (const g of p.gaten) { const k = `${Math.round(g.c.x * 1000)},${Math.round(g.c.y * 1000)},${Math.round(g.r * 1000)}`; if (circ.has(k)) dubbel++; circ.add(k); }
  if (dubbel) add('dubbel', `${dubbel} dubbele lijn${dubbel === 1 ? '' : 'en'}`);
  for (const g of p.gaten) if (2 * g.r < p.t - 1e-6) add('klein gat', `gat Ø${(2 * g.r).toFixed(1)} kleiner dan de plaatdikte ${p.t} mm`);
  for (const l of p.binnen) { const r = minRect(loopPolygon(l)); if (r.b < p.t - 1e-6) add('klein gat', `uitsparing ${r.a.toFixed(1)} x ${r.b.toFixed(1)} smaller dan de plaatdikte ${p.t} mm`); }
  // webs: between every two cut-outs and between a cut-out and the outline
  const cuts = [...p.binnen.map((l) => loopPolygon(l)), ...p.gaten.map((g) => Array.from({ length: 24 }, (_, k) => ({ x: g.c.x + g.r * Math.cos((k * Math.PI) / 12),
    y: g.c.y + g.r * Math.sin((k * Math.PI) / 12) })))];
  const outer = loopPolygon(p.buiten);
  const box = (q: P2[]) => ({ x0: Math.min(...q.map((z) => z.x)), x1: Math.max(...q.map((z) => z.x)), y0: Math.min(...q.map((z) => z.y)), y1: Math.max(...q.map((z) => z.y)) });
  const boxes = cuts.map(box);
  let steg = 0;
  for (let i = 0; i < cuts.length; i++) {
    for (let j = i + 1; j < cuts.length; j++) {
      const a = boxes[i], b = boxes[j];
      if (a.x0 - b.x1 > p.t || b.x0 - a.x1 > p.t || a.y0 - b.y1 > p.t || b.y0 - a.y1 > p.t) continue;
      if (polyDistance(cuts[i], cuts[j]) < p.t - 1e-6) steg++;
    }
    if (polyDistance(cuts[i], outer) < p.t - 1e-6) steg++;
  }
  if (steg) add('smalle steg', `${steg} steg${steg === 1 ? '' : 'en'} smaller dan de plaatdikte ${p.t} mm`);
  for (const b of p.plooien) {
    const near = cuts.filter((c) => c.some((q) => distPointSeg(q, b.a, b.b) < bendDistance - 1e-6)).length;
    if (near) add('gat bij plooi', `${near} uitsparing${near === 1 ? '' : 'en'} dichter dan ${bendDistance.toFixed(1)} mm bij een plooilijn`);
  }
  return out;
}

export const blocksExport = (f: Finding[]) => f.some((x) => x.blokkeert);
