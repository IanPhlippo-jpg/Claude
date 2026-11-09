import { Font } from 'three/examples/jsm/loaders/FontLoader.js';
import regular from 'three/examples/fonts/helvetiker_regular.typeface.json';
import bold from 'three/examples/fonts/helvetiker_bold.typeface.json';
import type { SketchPoint } from './types';

/**
 * Glyph outlines for Sketch Text: every outer contour and hole of the text as closed polylines,
 * lower left of the first character at the origin, cap height = `height` (as the Sketch Text font height).
 */
const fonts: Record<string, Font> = {};
function font(isBold: boolean): Font {
  const k = isBold ? 'b' : 'r';
  return (fonts[k] ??= new Font((isBold ? bold : regular) as unknown as ConstructorParameters<typeof Font>[0]));
}

const cache = new Map<string, SketchPoint[][][]>();
const caps: Record<string, number> = {};
function capRatio(f: Font, isBold: boolean): number {
  const k = isBold ? 'b' : 'r';
  if (caps[k] === undefined) {
    let top = 0;
    for (const sh of f.generateShapes('H', 1)) for (const p of sh.getPoints(2)) top = Math.max(top, p.y);
    caps[k] = top > 0 ? top : 0.72;
  }
  return caps[k];
}

/**
 * The glyph outlines as the font draws them (QA 0.5.12 F201): every outer contour and hole a closed loop of segments, each
 * segment its Bezier poles (2 for a line, 3 for a quadratic, 4 for a cubic curve). The exact kernel builds the letter
 * curves from these; the polylines for the mesh kernel and the screen follow them within TEXT_DEVIATION.
 */
export function textBeziers(text: string, height: number, isBold = false, spacing = 100): SketchPoint[][][] {
  const key = `${text}|${height}|${isBold}|${spacing}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const f = font(isBold);
  // generateShapes sizes by the em: scale so the capital H is exactly `height` tall
  const em = height / capRatio(f, isBold);
  const loops: SketchPoint[][][] = [];
  let x = 0;
  const extra = ((spacing - 100) / 100) * em * 0.3;
  const segs = (path: { curves: unknown[] }, dx: number) => {
    const out: SketchPoint[][] = [];
    for (const c of path.curves as { type: string; v0: V; v1: V; v2: V; v3: V }[]) {
      const poles = c.type === 'CubicBezierCurve' ? [c.v0, c.v1, c.v2, c.v3] : c.type === 'QuadraticBezierCurve' ? [c.v0, c.v1, c.v2] : [c.v1, c.v2];
      const pts = poles.map((p) => ({ x: p.x + dx, y: p.y }));
      if (pts.some((p) => Math.hypot(p.x - pts[0].x, p.y - pts[0].y) > 1e-9)) out.push(pts);
    }
    // closed: the last segment ends where the first starts
    const a = out[0]?.[0], b = out[out.length - 1]?.[out[out.length - 1].length - 1];
    if (a && b && Math.hypot(a.x - b.x, a.y - b.y) > 1e-9) out.push([{ ...b }, { ...a }]);
    return out;
  };
  for (const ch of text) {
    if (ch === ' ') {
      x += em * 0.28 + extra;
      continue;
    }
    const shapes = f.generateShapes(ch, em);
    let maxX = 0;
    for (const sh of shapes) {
      const outer = segs(sh, x);
      if (outer.length) loops.push(outer);
      for (const h of sh.holes) { const l = segs(h, x); if (l.length) loops.push(l); }
      for (const sg of outer) for (const p of sg) maxX = Math.max(maxX, p.x - x);
    }
    // advance: the glyph's own advance width when the font has it
    const data = (f.data as unknown as { glyphs: Record<string, { ha: number }>; resolution: number });
    const g = data.glyphs[ch];
    x += (g ? (g.ha * em) / data.resolution : maxX + em * 0.1) + extra;
  }
  cache.set(key, loops);
  return loops;
}
type V = { x: number; y: number };

/** how far the polyline of a letter curve may lie from the curve (mm): under the mesh kernel's 0.02 mm for arcs */
export const TEXT_DEVIATION = 0.01;

/**
 * A loop of Bezier segments as a closed polyline (last point = first) within `tol` of the curves: a segment of degree d
 * with second differences D has |B''| ≤ d(d−1)·max|D|, and n chords of a curve with |B''| ≤ M stay within M / (8 n²).
 */
export function sampleBeziers(loop: SketchPoint[][], tol = TEXT_DEVIATION): SketchPoint[] {
  const out: SketchPoint[] = [];
  for (const p of loop) {
    const d = p.length - 1;
    let n = 1;
    if (d >= 2) {
      let m = 0;
      for (let i = 0; i + 2 <= d; i++) m = Math.max(m, Math.hypot(p[i].x - 2 * p[i + 1].x + p[i + 2].x, p[i].y - 2 * p[i + 1].y + p[i + 2].y));
      n = Math.min(256, Math.max(1, Math.ceil(Math.sqrt((d * (d - 1) * m) / (8 * tol)))));
    }
    for (let k = out.length ? 1 : 0; k <= n; k++) out.push(bezierAt(p, k / n));
  }
  return dedupe(out);
}

/** the point at t of a Bezier segment (de Casteljau) */
export function bezierAt(p: SketchPoint[], t: number): SketchPoint {
  let q = p.map((x) => ({ x: x.x, y: x.y }));
  while (q.length > 1) q = q.slice(1).map((b, i) => ({ x: q[i].x + (b.x - q[i].x) * t, y: q[i].y + (b.y - q[i].y) * t }));
  return q[0];
}

/** every outer contour and hole of the text as closed polylines (within TEXT_DEVIATION of the letter curves) */
export function textOutlines(text: string, height: number, isBold = false, spacing = 100): SketchPoint[][] {
  return textBeziers(text, height, isBold, spacing).map((l) => sampleBeziers(l));
}

function dedupe(pts: SketchPoint[]): SketchPoint[] {
  const out: SketchPoint[] = [];
  for (const p of pts) {
    const q = out[out.length - 1];
    if (!q || Math.hypot(p.x - q.x, p.y - q.y) > 1e-6) out.push(p);
  }
  // closed: last equals first
  if (out.length > 2 && Math.hypot(out[0].x - out[out.length - 1].x, out[0].y - out[out.length - 1].y) > 1e-6) out.push({ ...out[0] });
  return out;
}
