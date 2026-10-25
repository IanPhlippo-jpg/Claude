import type { Sketch, SketchPoint } from '../sketch/types';
import { sampleEntity } from '../sketch/geometry';
import { polyArea, type Region } from './regions';

export type ThinMode = 'one' | 'mid' | 'two';

export interface ThinOptions {
  mode: ThinMode;
  thickness: number;
  /** two-direction: thickness of the second side */
  thickness2?: number;
  /** one-direction: wall on the other side of the profile */
  reverse?: boolean;
}

const same = (a: SketchPoint, b: SketchPoint) => Math.hypot(a.x - b.x, a.y - b.y) < 1e-4;

/** Chains of the sketch entities (lines, arcs, splines, circles) as polylines; closed chains have closed = true. */
export function sketchChains(sketch: Sketch): { points: SketchPoint[]; closed: boolean }[] {
  const pieces: SketchPoint[][] = [];
  for (const id of sketch.entityOrder) {
    const e = sketch.entities[id];
    if (e.kind === 'point' || e.construction) continue;
    const pts = sampleEntity(sketch, e, 32);
    if (pts.length >= 2) pieces.push(pts);
  }
  const chains: { points: SketchPoint[]; closed: boolean }[] = [];
  while (pieces.length) {
    const chain = pieces.shift()!.slice();
    let guard = 0;
    for (;;) {
      if (guard++ > 1000) break;
      const end = chain[chain.length - 1], start = chain[0];
      let found = -1, reverse = false, atStart = false;
      for (let i = 0; i < pieces.length; i++) {
        const p = pieces[i];
        if (same(p[0], end)) { found = i; break; }
        if (same(p[p.length - 1], end)) { found = i; reverse = true; break; }
        if (same(p[p.length - 1], start)) { found = i; atStart = true; break; }
        if (same(p[0], start)) { found = i; atStart = true; reverse = true; break; }
      }
      if (found < 0) break;
      const p = pieces.splice(found, 1)[0];
      const seq = reverse ? p.slice().reverse() : p;
      if (atStart) chain.unshift(...seq.slice(0, -1));
      else chain.push(...seq.slice(1));
    }
    const closed = chain.length > 2 && same(chain[0], chain[chain.length - 1]);
    if (closed) chain.pop();
    chains.push({ points: dedupe(chain), closed });
  }
  return chains;
}

function dedupe(pts: SketchPoint[]): SketchPoint[] {
  const out: SketchPoint[] = [];
  for (const p of pts) if (!out.length || !same(out[out.length - 1], p)) out.push(p);
  return out;
}

/**
 * Offset a polyline by d to its left (d > 0) with mitred corners (the join of the two offset
 * lines); very sharp corners are bevelled so the offset stays bounded.
 */
export function offsetPolyline(pts: SketchPoint[], d: number, closed: boolean): SketchPoint[] {
  const n = pts.length;
  if (n < 2 || Math.abs(d) < 1e-9) return pts.slice();
  const dirs: SketchPoint[] = [];
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    dirs.push({ x: (b.x - a.x) / len, y: (b.y - a.y) / len });
  }
  const left = (v: SketchPoint) => ({ x: -v.y, y: v.x });
  const out: SketchPoint[] = [];
  for (let i = 0; i < n; i++) {
    const prev = closed ? dirs[(i - 1 + segs) % segs] : i > 0 ? dirs[i - 1] : null;
    const next = closed ? dirs[i % segs] : i < segs ? dirs[i] : null;
    const p = pts[i];
    if (!prev || !next) {
      const v = (prev ?? next)!;
      const nl = left(v);
      out.push({ x: p.x + nl.x * d, y: p.y + nl.y * d });
      continue;
    }
    const n1 = left(prev), n2 = left(next);
    const bis = { x: n1.x + n2.x, y: n1.y + n2.y };
    const bl = Math.hypot(bis.x, bis.y);
    const cosHalf = bl / 2;
    if (bl < 1e-9 || cosHalf < 0.15) {
      // reversal or very sharp corner: bevel with the two offsets
      out.push({ x: p.x + n1.x * d, y: p.y + n1.y * d }, { x: p.x + n2.x * d, y: p.y + n2.y * d });
      continue;
    }
    const m = d / cosHalf / bl;
    out.push({ x: p.x + bis.x * m, y: p.y + bis.y * m });
  }
  return out;
}

/** Regions of a thin feature: a band of the given thickness along each chain (open) or a ring (closed). */
export function thinRegions(chains: { points: SketchPoint[]; closed: boolean }[], opt: ThinOptions): Region[] {
  const t = Math.max(1e-6, opt.thickness);
  const t2 = Math.max(0, opt.thickness2 ?? t);
  let dl: number, dr: number; // offsets to the left and to the right (left = +, right = −)
  if (opt.mode === 'mid') { dl = t / 2; dr = -t / 2; }
  else if (opt.mode === 'two') { dl = t; dr = -t2; }
  else if (opt.reverse) { dl = 0; dr = -t; }
  else { dl = t; dr = 0; }
  const out: Region[] = [];
  for (const c of chains) {
    if (c.points.length < 2) continue;
    if (c.closed) {
      const ccw = polyArea(c.points) > 0 ? c.points : c.points.slice().reverse();
      // for a counter-clockwise loop the left offset is outward
      const outerD = Math.max(dl, dr), innerD = Math.min(dl, dr);
      const outer = offsetPolyline(ccw, outerD, true);
      const inner = offsetPolyline(ccw, innerD, true);
      const region: Region = { outer, holes: [inner.slice().reverse()], area: Math.abs(polyArea(outer)) - Math.abs(polyArea(inner)) };
      out.push(region);
    } else {
      const a = offsetPolyline(c.points, dl, false);
      const b = offsetPolyline(c.points, dr, false);
      const poly = [...a, ...b.slice().reverse()];
      const area = polyArea(poly);
      out.push({ outer: area < 0 ? poly.slice().reverse() : poly, holes: [], area: Math.abs(area) });
    }
  }
  return out;
}
