import { describe, expect, it } from 'vitest';
import { area, contains, totalArea, union as ownUnion, intersection as ownIntersection, type Paths } from './boolean';
import { offset as ownOffset } from './offset';
import { poly } from './polygons';

const U = 10000; // grid units per mm
const rect = (x0: number, y0: number, x1: number, y1: number, ccw = true) => (ccw ? [x0, y0, x1, y0, x1, y1, x0, y1] : [x0, y0, x0, y1, x1, y1, x1, y0]).map((v) => v * U);
const circle = (cx: number, cy: number, r: number, n = 64, ccw = true) => {
  const p: number[] = [];
  for (let i = 0; i < n; i++) { const t = ((ccw ? 1 : -1) * 2 * Math.PI * i) / n; p.push(Math.round((cx + r * Math.cos(t)) * U), Math.round((cy + r * Math.sin(t)) * U)); }
  return p;
};
const mm2 = (ps: Paths) => totalArea(ps) / (U * U);
let seed = 4242;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);

/** independent oracle: the offset area from a distance field on a raster (slow, never fails: docs/34 2.3) */
function rasterOffsetArea(region: Paths, d: number, cell = 0.02): number {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of region) for (let i = 0; i < p.length; i += 2) { minX = Math.min(minX, p[i] / U); maxX = Math.max(maxX, p[i] / U); minY = Math.min(minY, p[i + 1] / U); maxY = Math.max(maxY, p[i + 1] / U); }
  const pad = Math.max(0, d) + 2 * cell;
  const segs: number[] = [];
  for (const p of region) for (let i = 0; i < p.length; i += 2) { const j = (i + 2) % p.length; segs.push(p[i] / U, p[i + 1] / U, p[j] / U, p[j + 1] / U); }
  const dist = (x: number, y: number) => {
    let best = Infinity;
    for (let s = 0; s < segs.length; s += 4) {
      const ax = segs[s], ay = segs[s + 1], bx = segs[s + 2], by = segs[s + 3];
      const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L));
      best = Math.min(best, Math.hypot(ax + dx * t - x, ay + dy * t - y));
    }
    return best;
  };
  let count = 0;
  for (let y = minY - pad + cell / 2; y < maxY + pad; y += cell) {
    for (let x = minX - pad + cell / 2; x < maxX + pad; x += cell) {
      const ins = contains(region, x * U, y * U);
      const dd = dist(x, y);
      if (d >= 0 ? ins || dd <= d : ins && dd >= -d) count++;
    }
  }
  return count * cell * cell;
}

/** a loop crosses itself (proper crossing of two non-adjacent edges) */
function selfCrossing(p: number[]): boolean {
  const n = p.length / 2;
  const o = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) => Math.sign((bx - ax) * (cy - ay) - (by - ay) * (cx - ax));
  for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) {
    if (i === 0 && j === n - 1) continue;
    const [a, b, c, d] = [i, (i + 1) % n, j, (j + 1) % n];
    const d1 = o(p[2 * c], p[2 * c + 1], p[2 * d], p[2 * d + 1], p[2 * a], p[2 * a + 1]), d2 = o(p[2 * c], p[2 * c + 1], p[2 * d], p[2 * d + 1], p[2 * b], p[2 * b + 1]);
    const d3 = o(p[2 * a], p[2 * a + 1], p[2 * b], p[2 * b + 1], p[2 * c], p[2 * c + 1]), d4 = o(p[2 * a], p[2 * a + 1], p[2 * b], p[2 * b + 1], p[2 * d], p[2 * d + 1]);
    if (d1 * d2 < 0 && d3 * d4 < 0) return true;
  }
  return false;
}

describe('polygon booleans (Clipper2 behind geom/polygons.ts)', () => {
  it('unites, intersects and subtracts squares', () => {
    expect(mm2(poly.union([rect(0, 0, 10, 10), rect(5, 5, 15, 15)]))).toBeCloseTo(175, 6);
    expect(mm2(poly.intersection([rect(0, 0, 10, 10)], [rect(5, 5, 15, 15)]))).toBeCloseTo(25, 6);
    const d = poly.difference([rect(0, 0, 10, 10)], [rect(2, 2, 8, 8)]);
    expect(d).toHaveLength(2);
    expect(mm2(d)).toBeCloseTo(64, 6);
    expect(d.filter((p) => area(p) < 0)).toHaveLength(1);
  });
  it('drops a clockwise loop (positive rule); the non-zero union keeps it', () => {
    expect(poly.union([rect(0, 0, 10, 10, false)])).toEqual([]);
    expect(mm2(poly.unionNonZero([rect(0, 0, 10, 10, false)]))).toBeCloseTo(100, 6);
  });
  it('P1-2: 300 pairs of near-equal polygons (vertices 1 unit apart) give the right intersection, union and difference', () => {
    let worst = 0;
    for (let k = 0; k < 300; k++) {
      const n = 24 + Math.floor(rnd() * 200), r = 5 + rnd() * 15;
      const p = circle(50, 50, r, n);
      const q = p.map((v) => v + Math.round(rnd() * 2 - 1));
      const a = mm2([p]);
      const per = 2 * Math.PI * r;
      // the true difference of the two areas is at most perimeter x 1 unit
      const tol = (per * 1.5) / U + 1e-6;
      const inter = mm2(poly.intersection([p], [q])), uni = mm2(poly.union([p], [q])), diff = mm2(poly.difference([p], [q]));
      worst = Math.max(worst, Math.abs(inter - a), Math.abs(uni - a), Math.abs(diff));
      expect(Math.abs(inter - a), `pair ${k}: intersection ${inter} of ${a}`).toBeLessThan(tol);
      expect(Math.abs(uni - a), `pair ${k}: union ${uni}`).toBeLessThan(tol);
      expect(diff, `pair ${k}: difference`).toBeLessThan(tol);
    }
    expect(worst).toBeLessThan(0.02);
  });
  it('10 000 random polygons: no exception, no NaN, a clean result without self-crossings', () => {
    for (let k = 0; k < 10000; k++) {
      const ps: Paths = [];
      for (let q = 0; q < 1 + Math.floor(rnd() * 3); q++) {
        const n = 3 + Math.floor(rnd() * 9), p: number[] = [];
        for (let i = 0; i < n; i++) p.push(Math.round(rnd() * 20 * U), Math.round(rnd() * 20 * U));
        ps.push(p);
      }
      const r = poly.union(ps);
      for (const p of r) {
        for (const v of p) expect(Number.isFinite(v)).toBe(true);
        expect(selfCrossing(p), `case ${k}`).toBe(false);
      }
      const a = mm2(r);
      expect(a).toBeGreaterThanOrEqual(-1e-6);
      expect(a).toBeLessThanOrEqual(400 + 1e-6);
    }
  });
  it('our own engine agrees with Clipper2 on random unions (oracle)', () => {
    for (let k = 0; k < 200; k++) {
      const ps: Paths = [];
      for (let q = 0; q < 2; q++) { const p: number[] = []; for (let i = 0; i < 6; i++) p.push(Math.round(rnd() * 20 * U), Math.round(rnd() * 20 * U)); ps.push(p); }
      expect(Math.abs(mm2(ownUnion(ps)) - mm2(poly.union(ps)))).toBeLessThan(0.01);
      expect(Math.abs(mm2(ownIntersection([ps[0]], [ps[1]])) - mm2(poly.intersection([ps[0]], [ps[1]])))).toBeLessThan(0.01);
    }
  });
});

describe('polygon offset', () => {
  it('shrinks and grows a square exactly (round outer corners)', () => {
    expect(mm2(poly.offset([rect(0, 0, 20, 20)], -1 * U))).toBeCloseTo(324, 3);
    expect(mm2(poly.offset([rect(0, 0, 20, 20)], 1 * U))).toBeCloseTo(400 + 80 + Math.PI, 2);
  });
  it('a convex polygon grown then shrunk by 0.4 mm gives the original within 2 µm', () => {
    for (const shape of [[rect(0, 0, 20, 20)], [circle(10, 10, 8, 7)], [[0, 0, 30 * U, 2 * U, 12 * U, 20 * U]]]) {
      const back = poly.offset(poly.offset(shape, 0.4 * U), -0.4 * U);
      // every vertex of the original lies within 2 µm of the result's boundary
      for (let i = 0; i < shape[0].length; i += 2) {
        let best = Infinity;
        for (const p of back) for (let k = 0; k < p.length; k += 2) {
          const j = (k + 2) % p.length, dx = p[j] - p[k], dy = p[j + 1] - p[k + 1], L = dx * dx + dy * dy || 1;
          const t = Math.max(0, Math.min(1, ((shape[0][i] - p[k]) * dx + (shape[0][i + 1] - p[k + 1]) * dy) / L));
          best = Math.min(best, Math.hypot(p[k] + dx * t - shape[0][i], p[k + 1] + dy * t - shape[0][i + 1]));
        }
        expect(best / U, 'distance (mm)').toBeLessThan(0.002);
      }
    }
  });
  it('a ring wall of 0.3 mm vanishes at -0.225 mm; one of 0.8 mm keeps two loops', () => {
    expect(poly.offset([rect(0, 0, 40, 40), rect(0.3, 0.3, 39.7, 39.7, false)], -0.225 * U)).toEqual([]);
    expect(poly.offset([rect(0, 0, 40, 40), rect(0.8, 0.8, 39.2, 39.2, false)], -0.225 * U)).toHaveLength(2);
  });
  it('splits a dumbbell at its neck; closes a hole when grown', () => {
    expect(poly.offset(poly.union([rect(0, 0, 10, 10), rect(10, 4.5, 20, 5.5), rect(20, 0, 30, 10)]), -1 * U)).toHaveLength(2);
    expect(poly.offset([rect(0, 0, 20, 20), circle(10, 10, 1, 64, false)], 1.2 * U)).toHaveLength(1);
  });
  it('agrees with the raster oracle within 0.5 % or 0.05 mm² (the larger), and our own offset too', () => {
    const shapes: Paths[] = [
      [rect(0, 0, 12, 8), circle(6, 4, 2, 48, false)],
      poly.union([rect(0, 0, 10, 3), rect(0, 0, 3, 10), rect(7, 0, 10, 10)]),
      [circle(5, 5, 4, 40)],
    ];
    for (const s of shapes) {
      for (const d of [-0.6, -0.2, 0.3, 1]) {
        const ours = mm2(poly.offset(s, d * U));
        const oracle = rasterOffsetArea(s, d, 0.01);
        expect(Math.abs(ours - oracle), `d=${d}: ${ours} vs ${oracle}`).toBeLessThan(Math.max(0.005 * oracle, 0.05));
        expect(Math.abs(mm2(ownOffset(s, d * U, 10)) - ours), `own offset d=${d}`).toBeLessThan(Math.max(0.005 * oracle, 0.05));
      }
    }
  });
  it('P2-6: 1500 random regions offset by -0.2 and +0.3 mm: clean loops without self-crossings', () => {
    for (let k = 0; k < 1500; k++) {
      const p: number[] = [];
      const n = 3 + Math.floor(rnd() * 10);
      for (let i = 0; i < n; i++) p.push(Math.round(rnd() * 20 * U), Math.round(rnd() * 20 * U));
      const region = poly.union([p]);
      for (const d of [-0.2, 0.3]) for (const loop of poly.offset(region, d * U)) {
        expect(loop.every(Number.isFinite)).toBe(true);
        expect(selfCrossing(loop), `case ${k}, d=${d}`).toBe(false);
      }
    }
  });
  // a timing test: retried when another test file running in parallel took the CPU at the wrong moment
  it('offsets a contour of 10 000 points in less than 50 ms', { retry: 3 }, () => {
    const big = [circle(50, 50, 40, 10000)];
    for (let k = 0; k < 3; k++) poly.offset(big, -0.4 * U);
    // the best CPU time of five runs (a test machine running other test files in parallel disturbs single runs)
    const times: number[] = [];
    let r: Paths = [];
    for (let k = 0; k < 5; k++) { const c0 = process.cpuUsage(); r = poly.offset(big, -0.4 * U); const c = process.cpuUsage(c0); times.push(c.user / 1000); }
    expect(r).toHaveLength(1);
    expect(Math.min(...times)).toBeLessThan(50);
  });
});
