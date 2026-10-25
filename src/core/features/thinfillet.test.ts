import { describe, expect, it } from 'vitest';
import { roundCorners } from './rebuild';

describe('Thin Feature > Auto-fillet corners', () => {
  it('the corner of an L becomes an arc of the radius, tangent to both legs', () => {
    const out = roundCorners([{ x: 0, y: 20 }, { x: 0, y: 0 }, { x: 20, y: 0 }], 5, false);
    expect(out.length).toBeGreaterThan(5);
    expect(out[1].x).toBeCloseTo(0, 6);
    expect(out[1].y).toBeCloseTo(5, 6);
    expect(out[out.length - 2].x).toBeCloseTo(5, 6);
    expect(out[out.length - 2].y).toBeCloseTo(0, 6);
    for (const p of out.slice(1, -1)) expect(Math.hypot(p.x - 5, p.y - 5)).toBeCloseTo(5, 6);
  });
});
