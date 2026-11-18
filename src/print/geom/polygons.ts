/**
 * The one interface the slicer uses for polygon work (docs/34 R3): booleans, offset and line clipping on the integer
 * grid. The engine behind it is our own (boolean.ts, offset.ts); a library such as a Clipper2 port can replace it here
 * without touching the slicer.
 */
import { contains, difference, intersection, totalArea, union, type Path, type Paths } from './boolean';
import { offset, opening } from './offset';

export type { Path, Paths };

/** grid units per millimetre: 0.1 µm (docs/34 2.2: cross products stay exact below 2^53 on an 800 mm bed) */
export const UNITS = 10000;
export const toUnits = (mm: number) => Math.round(mm * UNITS);

export interface PolygonEngine {
  union(a: Paths, b?: Paths): Paths;
  difference(a: Paths, b: Paths): Paths;
  intersection(a: Paths, b: Paths): Paths;
  /** delta in grid units; positive grows the filled side */
  offset(a: Paths, delta: number): Paths;
  opening(a: Paths, d: number): Paths;
  contains(region: Paths, x: number, y: number): boolean;
  area(a: Paths): number;
}

export const poly: PolygonEngine = {
  union,
  difference,
  intersection,
  offset: (a, d) => offset(a, d, 50),
  opening: (a, d) => opening(a, d, 50),
  contains,
  area: totalArea,
};

/** a region prepared for many line clips: its edges in strips over Y (crossings and point tests touch one strip) */
export class RegionIndex {
  private edges: number[] = [];
  private strips: number[][];
  private minY = Infinity;
  private sh: number;
  constructor(region: Paths) {
    let maxY = -Infinity;
    for (const p of region) {
      for (let i = 0; i < p.length; i += 2) {
        const j = (i + 2) % p.length;
        this.edges.push(p[i], p[i + 1], p[j], p[j + 1]);
        this.minY = Math.min(this.minY, p[i + 1]); maxY = Math.max(maxY, p[i + 1]);
      }
    }
    const k = Math.max(1, Math.min(2048, Math.ceil(this.edges.length / 16)));
    this.sh = Math.max(1, (maxY - this.minY) / k);
    this.strips = Array.from({ length: k }, () => []);
    for (let e = 0; e < this.edges.length; e += 4) {
      const [a, b] = this.range(this.edges[e + 1], this.edges[e + 3]);
      for (let q = a; q <= b; q++) this.strips[q].push(e);
    }
  }
  get empty() { return !this.edges.length; }
  private range(y0: number, y1: number): [number, number] {
    const k = this.strips.length;
    return [Math.max(0, Math.min(k - 1, Math.floor((Math.min(y0, y1) - this.minY) / this.sh))), Math.max(0, Math.min(k - 1, Math.floor((Math.max(y0, y1) - this.minY) / this.sh)))];
  }
  /** point in region (positive winding) */
  contains(x: number, y: number): boolean {
    if (this.empty) return false;
    const q = Math.floor((y - this.minY) / this.sh);
    if (q < 0 || q >= this.strips.length) return false;
    let w = 0;
    const E = this.edges;
    for (const e of this.strips[q]) {
      const y0 = E[e + 1], y1 = E[e + 3];
      if (y0 <= y && y < y1) { if (E[e] + ((y - y0) * (E[e + 2] - E[e])) / (y1 - y0) > x) w++; } else if (y1 <= y && y < y0) { if (E[e] + ((y - y0) * (E[e + 2] - E[e])) / (y1 - y0) > x) w--; }
    }
    return w > 0;
  }
  /** the parameters (0..1, sorted) where segment a-b crosses an edge of the region */
  crossings(ax: number, ay: number, bx: number, by: number): number[] {
    const ts: number[] = [];
    if (this.empty) return ts;
    const [qa, qb] = this.range(ay, by);
    const E = this.edges, dx = bx - ax, dy = by - ay;
    const seen = qa === qb ? null : new Set<number>();
    for (let q = qa; q <= qb; q++) {
      for (const e of this.strips[q]) {
        if (seen) { if (seen.has(e)) continue; seen.add(e); }
        const cx = E[e], cy = E[e + 1], ex = E[e + 2] - cx, ey = E[e + 3] - cy;
        if (Math.max(cx, cx + ex) < Math.min(ax, bx) || Math.min(cx, cx + ex) > Math.max(ax, bx)) continue;
        const den = dx * ey - dy * ex;
        if (den === 0) continue;
        const t = ((cx - ax) * ey - (cy - ay) * ex) / den;
        const u = ((cx - ax) * dy - (cy - ay) * dx) / den;
        if (t > 0 && t < 1 && u >= 0 && u < 1) ts.push(t);
      }
    }
    return ts.sort((p, r) => p - r);
  }
}

/**
 * Clips straight segments against a region (even-odd crossings of a clean region): returns the inside pieces as flat
 * x0, y0, x1, y1 quadruples. Used for infill, support and bridge lines; no boolean needed (docs/34 2.3).
 */
export function clipSegments(segs: number[], region: Paths | RegionIndex): number[] {
  const idx = region instanceof RegionIndex ? region : new RegionIndex(region);
  const out: number[] = [];
  if (idx.empty) return out;
  for (let s = 0; s < segs.length; s += 4) {
    const ax = segs[s], ay = segs[s + 1], bx = segs[s + 2], by = segs[s + 3];
    const dx = bx - ax, dy = by - ay;
    let inside = idx.contains(ax, ay);
    let t0 = 0;
    for (const t of idx.crossings(ax, ay, bx, by)) {
      if (inside && t > t0) out.push(ax + dx * t0, ay + dy * t0, ax + dx * t, ay + dy * t);
      inside = !inside;
      t0 = t;
    }
    if (inside && t0 < 1) out.push(ax + dx * t0, ay + dy * t0, bx, by);
  }
  return out;
}

/**
 * Clips an open polyline (flat x, y) against a region: the inside pieces as polylines. The inside state is carried
 * from one segment to the next (one point-in-region test per polyline), so long wavy lines (gyroid) stay cheap.
 */
export function clipPolyline(pts: number[], region: Paths | RegionIndex): number[][] {
  const idx = region instanceof RegionIndex ? region : new RegionIndex(region);
  const out: number[][] = [];
  if (pts.length < 4 || idx.empty) return out;
  let inside = idx.contains(pts[0], pts[1]);
  let cur: number[] | null = inside ? [pts[0], pts[1]] : null;
  for (let i = 0; i + 3 < pts.length; i += 2) {
    const ax = pts[i], ay = pts[i + 1], bx = pts[i + 2], by = pts[i + 3];
    for (const t of idx.crossings(ax, ay, bx, by)) {
      const x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
      if (inside && cur) { cur.push(x, y); if (cur.length >= 4) out.push(cur); cur = null; } else cur = [x, y];
      inside = !inside;
    }
    if (inside && cur) cur.push(bx, by);
  }
  if (inside && cur && cur.length >= 4) out.push(cur);
  return out;
}
