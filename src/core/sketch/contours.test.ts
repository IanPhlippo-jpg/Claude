import { describe, expect, it } from 'vitest';
import { addArc, addCircle, addConstraint, addLine, createSketch } from './model';
import { findContours } from './contours';

describe('shaded sketch contours', () => {
  it('finds a rectangle built from chained lines and a circle', () => {
    let s = createSketch('s', 'S');
    let a, b, c;
    [s, a] = addLine(s, { x: 0, y: 0 }, { x: 40, y: 0 });
    [s, b] = addLine(s, a.p2, { x: 40, y: 20 });
    [s, c] = addLine(s, b.p2, { x: 0, y: 20 });
    [s] = addLine(s, c.p2, a.p1);
    [s] = addCircle(s, { x: 100, y: 0 }, 5);
    const cs = findContours(s);
    expect(cs.length).toBe(2);
    const rect = cs.find((k) => k.entityIds.length === 4)!;
    expect(rect.area).toBeCloseTo(800, 3);
    const circ = cs.find((k) => k.entityIds.length === 1)!;
    expect(circ.area).toBeCloseTo(Math.PI * 25, 0);
  });
  it('ignores open chains and construction geometry; uses coincident relations', () => {
    let s = createSketch('s', 'S');
    let a, b;
    [s, a] = addLine(s, { x: 0, y: 0 }, { x: 10, y: 0 });
    [s, b] = addLine(s, { x: 10, y: 0 }, { x: 10, y: 10 }); // separate points, same position
    let c;
    [s, c] = addLine(s, { x: 10, y: 10 }, { x: 0, y: 10 }, true); // construction: no closing
    [s] = addConstraint(s, 'coincident', [a.p2, b.p1]);
    expect(findContours(s).length).toBe(0);
    [s] = addLine(s, b.p2, a.p1);
    expect(findContours(s).length).toBe(1);
    void c;
  });
  it('still finds the rectangle when a dangling line hangs off a corner', () => {
    let s = createSketch('s', 'S');
    let a, b, c;
    [s, a] = addLine(s, { x: 0, y: 0 }, { x: 40, y: 0 });
    [s, b] = addLine(s, a.p2, { x: 40, y: 20 });
    [s, c] = addLine(s, b.p2, { x: 0, y: 20 });
    [s] = addLine(s, c.p2, a.p1);
    [s] = addLine(s, b.p2, { x: 60, y: 40 }); // spur
    const cs = findContours(s);
    expect(cs.length).toBe(1);
    expect(cs[0].area).toBeCloseTo(800, 3);
    expect(cs[0].points.length).toBe(4); // spur removed from the polygon
  });
  it('closes a slot made of two lines and two arcs', () => {
    let s = createSketch('s', 'S');
    let l1, arc1, l2;
    [s, l1] = addLine(s, { x: 0, y: 5 }, { x: 20, y: 5 });
    [s, arc1] = addArc(s, { x: 20, y: 0 }, l1.p2, { x: 20, y: -5 }, false);
    [s, l2] = addLine(s, arc1.end, { x: 0, y: -5 });
    [s] = addArc(s, { x: 0, y: 0 }, l2.p2, l1.p1, false);
    const cs = findContours(s);
    expect(cs.length).toBe(1);
    expect(cs[0].area).toBeCloseTo(20 * 10 + Math.PI * 25, 0);
  });
});
