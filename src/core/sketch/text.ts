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

const cache = new Map<string, SketchPoint[][]>();
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

export function textOutlines(text: string, height: number, isBold = false, spacing = 100): SketchPoint[][] {
  const key = `${text}|${height}|${isBold}|${spacing}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const f = font(isBold);
  // generateShapes sizes by the em: scale so the capital H is exactly `height` tall
  const em = height / capRatio(f, isBold);
  const loops: SketchPoint[][] = [];
  let x = 0;
  const extra = ((spacing - 100) / 100) * em * 0.3;
  for (const ch of text) {
    if (ch === ' ') {
      x += em * 0.28 + extra;
      continue;
    }
    const shapes = f.generateShapes(ch, em);
    let maxX = 0;
    for (const sh of shapes) {
      const outer = sh.getPoints(6).map((p) => ({ x: p.x + x, y: p.y }));
      loops.push(dedupe(outer));
      for (const h of sh.holes) loops.push(dedupe(h.getPoints(6).map((p) => ({ x: p.x + x, y: p.y }))));
      for (const p of outer) maxX = Math.max(maxX, p.x - x);
    }
    // advance: the glyph's own advance width when the font has it
    const data = (f.data as unknown as { glyphs: Record<string, { ha: number }>; resolution: number });
    const g = data.glyphs[ch];
    x += (g ? (g.ha * em) / data.resolution : maxX + em * 0.1) + extra;
  }
  cache.set(key, loops);
  return loops;
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
