import { describe, expect, it } from 'vitest';
import { addEllipse, addLine, addText, createSketch, removeEntity } from './model';
import { sketchRegions } from '../features/regions';
import { distanceToEntity, entityLoops, sketchBounds } from './geometry';

describe('Ellipse and Sketch Text', () => {
  it('ellipse: closed region with area pi·a·b, distance to the curve', () => {
    let s = createSketch('s', 'Sketch1', 'front');
    let e;
    [s, e] = addEllipse(s, { x: 0, y: 0 }, { x: 30, y: 0 }, 10);
    const r = sketchRegions(s);
    expect(r.length).toBe(1);
    expect(r[0].area).toBeCloseTo(Math.PI * 30 * 10, -1);
    expect(distanceToEntity(s, e, { x: 0, y: 12 })).toBeCloseTo(2, 1);
    expect(distanceToEntity(s, e, { x: 31, y: 0 })).toBeCloseTo(1, 1);
    s = removeEntity(s, e.id);
    expect(Object.keys(s.scalars).length).toBe(0);
  });
  it('rotated ellipse follows its major axis', () => {
    let s = createSketch('s', 'Sketch1', 'front');
    [s] = addEllipse(s, { x: 0, y: 0 }, { x: 0, y: 20 }, 5);
    const b = sketchBounds(s)!;
    expect(b.max.y).toBeCloseTo(20, 3);
    expect(b.max.x).toBeCloseTo(5, 1);
  });
  it('text: glyph outlines with counters as holes, cap height = font height', () => {
    let s = createSketch('s', 'Sketch1', 'front');
    let t;
    [s, t] = addText(s, { x: 0, y: 0 }, 'OBI', 10);
    const loops = entityLoops(s, t);
    // O: outer + counter, B: outer + 2 counters, I: outer
    expect(loops.length).toBe(6);
    const r = sketchRegions(s);
    expect(r.length).toBe(3);
    expect(r.reduce((n, x) => n + x.holes.length, 0)).toBe(3);
    const b = sketchBounds(s)!;
    expect(b.max.y).toBeGreaterThan(9.5);
    expect(b.max.y).toBeLessThan(11);
    expect(b.min.y).toBeGreaterThan(-0.5);
  });
  it('text inside a rectangle cuts holes in it (letters become islands)', () => {
    let s = createSketch('s', 'Sketch1', 'front');
    const c = [{ x: -5, y: -5 }, { x: 60, y: -5 }, { x: 60, y: 20 }, { x: -5, y: 20 }];
    for (let i = 0; i < 4; i++) s = addLine(s, c[i], c[(i + 1) % 4])[0];
    [s] = addText(s, { x: 0, y: 0 }, 'AB', 10);
    const r = sketchRegions(s);
    // the plate with 2 letter holes; A's counter and B's 2 counters are islands again
    expect(r[0].holes.length).toBe(2);
    expect(r.length).toBe(4);
  });
});
