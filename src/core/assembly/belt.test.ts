import { describe, expect, it } from 'vitest';
import { beltPath } from './belt';

describe('Belt/Chain', () => {
  it('two equal pulleys: twice the centre distance plus one circumference', () => {
    const r = beltPath([{ center: [0, 0, 0], axis: [0, 0, 1], radius: 10 }, { center: [100, 0, 0], axis: [0, 0, 1], radius: 10 }])!;
    expect(r.length).toBeCloseTo(200 + 2 * Math.PI * 10, 3);
    // the path stays outside both pulleys
    for (const p of r.points) {
      const d0 = Math.hypot(p.x, p.y), d1 = Math.hypot(p.x - 100, p.y);
      expect(Math.min(d0, d1)).toBeGreaterThan(9.999);
    }
  });
  it('three pulleys of different size make a closed loop; non-parallel axes are refused', () => {
    const r = beltPath([{ center: [0, 0, 0], axis: [0, 0, 1], radius: 20 }, { center: [120, 0, 0], axis: [0, 0, 1], radius: 10 }, { center: [60, 80, 0], axis: [0, 0, 1], radius: 8 }])!;
    expect(r.points[0].distanceTo(r.points[r.points.length - 1])).toBeLessThan(1e-9);
    expect(r.length).toBeGreaterThan(300);
    expect(beltPath([{ center: [0, 0, 0], axis: [0, 0, 1], radius: 5 }, { center: [50, 0, 0], axis: [1, 0, 0], radius: 5 }])).toBeNull();
  });
});
