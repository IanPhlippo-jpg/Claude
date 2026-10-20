import { describe, expect, it } from 'vitest';
import { addArc, addCircle, addLine, createSketch } from './model';
import { distanceToEntity, hitTest, sampleEntity, snap } from './geometry';

describe('geometry', () => {
  it('hit-tests points before curves', () => {
    let s = createSketch('s', 'S');
    let l;
    [s, l] = addLine(s, { x: 0, y: 0 }, { x: 10, y: 0 });
    const h = hitTest(s, { x: 9.8, y: 0.1 }, 0.5);
    expect(h?.kind).toBe('point');
    expect(h?.id).toBe(l.p2);
    const h2 = hitTest(s, { x: 5, y: 0.2 }, 0.5);
    expect(h2?.kind).toBe('entity');
    expect(h2?.id).toBe(l.id);
    expect(hitTest(s, { x: 5, y: 3 }, 0.5)).toBeNull();
  });

  it('distance to arc respects the sweep', () => {
    let s = createSketch('s', 'S');
    let a;
    [s, a] = addArc(s, { x: 0, y: 0 }, { x: 5, y: 0 }, { x: 0, y: 5 }, true);
    expect(distanceToEntity(s, a, { x: 3.5, y: 3.5 })).toBeCloseTo(5 - Math.hypot(3.5, 3.5), 6);
    // opposite side of circle: nearest is an end point
    expect(distanceToEntity(s, a, { x: -5, y: 0 })).toBeCloseTo(Math.hypot(5, 5), 6);
  });

  it('snaps to midpoint, on-curve and horizontal alignment', () => {
    let s = createSketch('s', 'S');
    let l, c;
    [s, l] = addLine(s, { x: 0, y: 0 }, { x: 10, y: 0 });
    [s, c] = addCircle(s, { x: 30, y: 30 }, 5);
    const m = snap(s, { x: 5.1, y: 0.1 }, 0.5, null);
    expect(m[0].kind).toBe('midpoint');
    expect(m[0].point).toEqual({ x: 5, y: 0 });
    const on = snap(s, { x: 35.2, y: 30 }, 0.5, null);
    expect(on[0].kind).toBe('on');
    expect(on[0].entityId).toBe(c.id);
    expect(on[0].point.x).toBeCloseTo(35, 6);
    const h = snap(s, { x: 50, y: 20.2 }, 0.5, { x: 40, y: 20 });
    expect(h[0].kind).toBe('horizontal');
    expect(h[0].point.y).toBe(20);
    expect(snap(s, { x: 0.1, y: 0 }, 0.5, null)[0].pointId).toBe(l.p1);
  });

  it('samples a circle as a closed polyline', () => {
    let s = createSketch('s', 'S');
    let c;
    [s, c] = addCircle(s, { x: 0, y: 0 }, 2);
    const pts = sampleEntity(s, c, 8);
    expect(pts.length).toBe(9);
    expect(pts[0].x).toBeCloseTo(pts[8].x, 9);
  });
});
