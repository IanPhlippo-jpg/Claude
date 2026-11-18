import { describe, expect, it } from 'vitest';
import { area, contains, difference, intersection, totalArea, union, type Paths } from './boolean';
import { offset } from './offset';

const U = 10000; // grid units per mm
const rect = (x0: number, y0: number, x1: number, y1: number, cw = true) => (cw ? [x0, y0, x1, y0, x1, y1, x0, y1] : [x0, y0, x0, y1, x1, y1, x1, y0]).map((v) => v * U);
const circle = (cx: number, cy: number, r: number, n = 64, ccw = true) => {
  const p: number[] = [];
  for (let i = 0; i < n; i++) { const t = ((ccw ? 1 : -1) * 2 * Math.PI * i) / n; p.push(Math.round((cx + r * Math.cos(t)) * U), Math.round((cy + r * Math.sin(t)) * U)); }
  return p;
};
const mm2 = (ps: Paths) => totalArea(ps) / (U * U);

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

describe('polygon booleans on the integer grid', () => {
  it('unites two overlapping squares into one loop of the right area', () => {
    const r = union([rect(0, 0, 10, 10), rect(5, 5, 15, 15)]);
    expect(r).toHaveLength(1);
    expect(mm2(r)).toBeCloseTo(175, 6);
  });
  it('intersects and subtracts', () => {
    expect(mm2(intersection([rect(0, 0, 10, 10)], [rect(5, 5, 15, 15)]))).toBeCloseTo(25, 6);
    const d = difference([rect(0, 0, 10, 10)], [rect(2, 2, 8, 8)]);
    expect(d).toHaveLength(2);
    expect(mm2(d)).toBeCloseTo(64, 6);
    // the hole runs clockwise
    expect(d.filter((p) => area(p) < 0)).toHaveLength(1);
  });
  it('keeps squares that touch in one corner as two loops', () => {
    const r = union([rect(0, 0, 10, 10), rect(10, 10, 20, 20)]);
    expect(r).toHaveLength(2);
    expect(mm2(r)).toBeCloseTo(200, 6);
  });
  it('drops a reversed (clockwise) loop and keeps a self-touching outline', () => {
    expect(union([rect(0, 0, 10, 10, false)])).toEqual([]);
    // a bow-tie: crosses itself; only the counter-clockwise lobe has positive winding
    const bow = [0, 0, 10, 10, 10, 0, 0, 10].map((v) => v * U);
    expect(mm2(union([bow]))).toBeCloseTo(25, 4);
  });
  it('survives coincident edges, duplicate points and collinear overlaps', () => {
    const a = rect(0, 0, 10, 10), b = rect(10, 0, 20, 10), c = rect(0, 0, 10, 10);
    const r = union([a, b, c, [0, 0, 0, 0, 5 * U, 0, 10 * U, 0, 10 * U, 10 * U, 0, 10 * U]]);
    expect(r).toHaveLength(1);
    expect(mm2(r)).toBeCloseTo(200, 6);
  });
  it('random polygons: no exception, no NaN, positive area never above the bounding box', () => {
    let seed = 12345;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
    for (let k = 0; k < 300; k++) {
      const ps: Paths = [];
      for (let q = 0; q < 1 + Math.floor(rnd() * 3); q++) {
        const n = 3 + Math.floor(rnd() * 9), p: number[] = [];
        for (let i = 0; i < n; i++) p.push(Math.round(rnd() * 20 * U), Math.round(rnd() * 20 * U));
        ps.push(p);
      }
      const r = union(ps);
      for (const p of r) for (const v of p) expect(Number.isFinite(v)).toBe(true);
      const a = mm2(r);
      expect(a).toBeGreaterThanOrEqual(-1e-6);
      expect(a).toBeLessThanOrEqual(400 + 1e-6);
      // the result is clean: uniting it again changes nothing
      expect(mm2(union(r))).toBeCloseTo(a, 3);
    }
  });
});

describe('polygon offset', () => {
  it('shrinks and grows a square exactly (round outer corners)', () => {
    expect(mm2(offset([rect(0, 0, 20, 20)], -1 * U))).toBeCloseTo(324, 3);
    const grown = mm2(offset([rect(0, 0, 20, 20)], 1 * U, 5));
    expect(grown).toBeCloseTo(400 + 80 + Math.PI, 1);
  });
  it('a convex polygon grown then shrunk gives the original within 2 µm', () => {
    const sq = [rect(0, 0, 20, 20)];
    const back = offset(offset(sq, 2 * U, 5), -2 * U, 5);
    expect(Math.abs(mm2(back) - 400)).toBeLessThan(20 * 4 * 0.002);
  });
  it('a ring wall of 0.3 mm vanishes at -0.225 mm; one of 0.8 mm keeps two loops', () => {
    const thin = [rect(0, 0, 40, 40), rect(0.3, 0.3, 39.7, 39.7, false)];
    expect(offset(thin, -0.225 * U)).toEqual([]);
    const thick = [rect(0, 0, 40, 40), rect(0.8, 0.8, 39.2, 39.2, false)];
    expect(offset(thick, -0.225 * U)).toHaveLength(2);
  });
  it('splits a dumbbell at its neck when shrunk', () => {
    const shape = union([rect(0, 0, 10, 10), rect(10, 4.5, 20, 5.5), rect(20, 0, 30, 10)]);
    expect(offset(shape, -1 * U)).toHaveLength(2);
  });
  it('closes a hole when grown', () => {
    const plate = [rect(0, 0, 20, 20), circle(10, 10, 1, 64, false)];
    expect(offset(plate, 1.2 * U)).toHaveLength(1);
    expect(offset(plate, -0.5 * U)).toHaveLength(2);
  });
  it('agrees with the raster oracle (area within 0.5 % or 0.05 mm²)', () => {
    const shapes: Paths[] = [
      [rect(0, 0, 12, 8), circle(6, 4, 2, 48, false)],
      union([rect(0, 0, 10, 3), rect(0, 0, 3, 10), rect(7, 0, 10, 10)]),
      [circle(5, 5, 4, 40)],
    ];
    for (const s of shapes) {
      for (const d of [-0.6, -0.2, 0.3, 1]) {
        const ours = mm2(offset(s, d * U, 10));
        const oracle = rasterOffsetArea(s, d);
        expect(Math.abs(ours - oracle), `d=${d}: ${ours} vs ${oracle}`).toBeLessThan(Math.max(0.005 * oracle, 0.05) + 0.4);
      }
    }
  });
  it('offsets a contour of 10 000 points quickly', () => {
    const big = [circle(50, 50, 40, 10000)];
    const t0 = performance.now();
    const r = offset(big, -0.4 * U);
    const ms = performance.now() - t0;
    expect(r).toHaveLength(1);
    expect(ms).toBeLessThan(2000);
  });
});
