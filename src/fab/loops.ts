/**
 * Loops of line and arc segments (bulge as in DXF) and the fit of arcs to a polygon: pure 2D, without the CAD core, so
 * the nest worker and the DXF writer stay small. flat.ts re-exports all of it.
 */
import type { P2 } from './geom';

export interface Seg { a: P2; bulge: number }
export type Loop = Seg[];


export const segSweep = (s: Seg) => 4 * Math.atan(s.bulge);
/** length of a segment from a to b */
export function segLength(a: P2, b: P2, bulge: number): number {
  const c = Math.hypot(b.x - a.x, b.y - a.y);
  if (Math.abs(bulge) < 1e-12) return c;
  const th = Math.abs(4 * Math.atan(bulge));
  return (c / (2 * Math.sin(th / 2))) * th;
}
export const loopLen = (l: Loop) => l.reduce((s, sg, i) => s + segLength(sg.a, l[(i + 1) % l.length].a, sg.bulge), 0);
/** signed area of a loop of lines and arcs (counter-clockwise positive) */
export function loopAreaB(l: Loop): number {
  let A = 0;
  l.forEach((sg, i) => {
    const b = l[(i + 1) % l.length].a;
    A += (sg.a.x * b.y - b.x * sg.a.y) / 2;
    if (Math.abs(sg.bulge) > 1e-12) {
      const th = 4 * Math.atan(sg.bulge);
      const c = Math.hypot(b.x - sg.a.x, b.y - sg.a.y), r = c / (2 * Math.sin(Math.abs(th) / 2));
      A += (r * r / 2) * (th - Math.sin(th));
    }
  });
  return A;
}

/** the circle through three points */
export function circle3(a: P2, b: P2, c: P2): { c: P2; r: number } | null {
  const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
  if (Math.abs(d) < 1e-12) return null;
  const a2 = a.x * a.x + a.y * a.y, b2 = b.x * b.x + b.y * b.y, c2 = c.x * c.x + c.y * c.y;
  const x = (a2 * (b.y - c.y) + b2 * (c.y - a.y) + c2 * (a.y - b.y)) / d, y = (a2 * (c.x - b.x) + b2 * (a.x - c.x) + c2 * (b.x - a.x)) / d;
  return { c: { x, y }, r: Math.hypot(a.x - x, a.y - y) };
}

const turn = (a: P2, b: P2, c: P2) => Math.atan2((b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x), (b.x - a.x) * (c.x - b.x) + (b.y - a.y) * (c.y - b.y));

/**
 * Lines and arcs from a polygon whose arcs are chords (W5): runs of at least three short segments that turn the same
 * way by less than 30 degrees each and lie on one circle within `tol` become one arc. A loop that is one circle is
 * returned as such.
 */
export function fitArcs(pts0: P2[], tol = 0.005): { loop: Loop } | { circle: { c: P2; r: number } } {
  const n = pts0.length;
  if (n >= 8) {
    const c = circle3(pts0[0], pts0[Math.floor(n / 3)], pts0[Math.floor((2 * n) / 3)]);
    // a full circle also needs small turns at every point: an octagon has all its corners on one circle (docs/37 P2.7)
    const smallTurns = pts0.every((p, i) => Math.abs(turn(pts0[(i + n - 1) % n], p, pts0[(i + 1) % n])) <= Math.PI / 6);
    if (c && smallTurns && pts0.every((p) => Math.abs(Math.hypot(p.x - c.c.x, p.y - c.c.y) - c.r) <= tol)) return { circle: c };
  }
  // start after the longest segment (a line, or the joint of two arcs), so no arc is cut in two
  let start = 0, best = -1;
  pts0.forEach((p, i) => { const q = pts0[(i + 1) % n]; const l = Math.hypot(q.x - p.x, q.y - p.y); if (l > best) { best = l; start = (i + 1) % n; } });
  const pts = [...pts0.slice(start), ...pts0.slice(0, start)];
  const at = (i: number) => pts[i % n];
  const loop: Loop = [];
  let i = 0;
  while (i < n) {
    let j = i + 3, okJ = -1, okC: { c: P2; r: number } | null = null;
    const sgn = Math.sign(turn(at(i), at(i + 1), at(i + 2)));
    while (j <= n) {
      const c = circle3(at(i), at(Math.floor((i + j) / 2)), at(j));
      if (!c) break;
      let good = true;
      for (let k = i; k <= j && good; k++) if (Math.abs(Math.hypot(at(k).x - c.c.x, at(k).y - c.c.y) - c.r) > tol) good = false;
      for (let k = i + 1; k < j && good; k++) { const tr = turn(at(k - 1), at(k), at(k + 1)); if (Math.sign(tr) !== sgn || Math.abs(tr) > Math.PI / 6) good = false; }
      if (!good) break;
      okJ = j; okC = c;
      j++;
    }
    if (okJ > 0 && okC) {
      let sweep = 0;
      for (let k = i; k < okJ; k++) {
        const a0 = Math.atan2(at(k).y - okC.c.y, at(k).x - okC.c.x), a1 = Math.atan2(at(k + 1).y - okC.c.y, at(k + 1).x - okC.c.x);
        let dA = a1 - a0;
        while (dA > Math.PI) dA -= 2 * Math.PI;
        while (dA < -Math.PI) dA += 2 * Math.PI;
        sweep += dA;
      }
      loop.push({ a: at(i), bulge: Math.tan(sweep / 4) });
      i = okJ;
    } else {
      loop.push({ a: at(i), bulge: 0 });
      i++;
    }
  }
  return { loop };
}


/** points along an arc segment (for drawing and for the nesting, which approximates arcs outward) */
export function arcPoints(a: P2, b: P2, bulge: number, steps: number): P2[] {
  const th = 4 * Math.atan(bulge);
  const c = Math.hypot(b.x - a.x, b.y - a.y), r = c / (2 * Math.sin(Math.abs(th) / 2));
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, h = Math.sqrt(Math.max(0, r * r - (c / 2) ** 2));
  const nx = -(b.y - a.y) / c, ny = (b.x - a.x) / c;
  const sgn = (bulge > 0 ? 1 : -1) * (Math.abs(th) > Math.PI ? -1 : 1);
  const cx = mx + sgn * nx * h, cy = my + sgn * ny * h;
  const a0 = Math.atan2(a.y - cy, a.x - cx);
  return Array.from({ length: steps + 1 }, (_, k) => ({ x: cx + r * Math.cos(a0 + (th * k) / steps), y: cy + r * Math.sin(a0 + (th * k) / steps) }));
}

