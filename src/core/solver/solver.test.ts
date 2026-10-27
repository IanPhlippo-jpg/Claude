import { describe, expect, it, beforeEach } from 'vitest';
import {
  addArc,
  addCircle,
  addConstraint,
  addLine,
  addPoint,
  createSketch,
  lineLength,
  resetIds,
} from '../sketch/model';
import { solveSketch } from './solver';
import { rref, determinedParams, dependentRows } from './linalg';

beforeEach(() => resetIds());

describe('linalg', () => {
  it('computes rank and free columns', () => {
    const r = rref([
      [1, 2, 3],
      [2, 4, 6],
    ]);
    expect(r.rank).toBe(1);
    expect(r.freeCols).toEqual([1, 2]);
  });
  it('finds determined parameters', () => {
    // x0 fixed, x1 free, x2 = x1 (free)
    const J = [
      [1, 0, 0],
      [0, 1, -1],
    ];
    expect(determinedParams(J, 3)).toEqual([true, false, false]);
  });
  it('finds dependent rows', () => {
    expect(dependentRows([[1, 0], [0, 1], [1, 1]])).toEqual([2]);
  });
});

describe('solver: basic geometry', () => {
  it('free line is under-defined with 4 dof', () => {
    let s = createSketch('s', 'Sketch1');
    let l;
    [s, l] = addLine(s, { x: 0, y: 0 }, { x: 10, y: 5 });
    const r = solveSketch(s);
    expect(r.status).toBe('under');
    expect(r.dof).toBe(4);
    expect(r.entityStatus[l.id]).toBe('under');
  });

  it('horizontal + length + coincident with origin fully defines a line', () => {
    let s = createSketch('s', 'Sketch1');
    let l;
    [s, l] = addLine(s, { x: 1, y: 1 }, { x: 10, y: 5 });
    [s] = addConstraint(s, 'coincident', [l.p1, s.origin]);
    [s] = addConstraint(s, 'horizontal', [l.id]);
    [s] = addConstraint(s, 'length', [l.id], { value: 25 });
    const r = solveSketch(s);
    expect(r.status).toBe('full');
    expect(r.dof).toBe(0);
    expect(r.entityStatus[l.id]).toBe('full');
    const p1 = r.sketch.points[l.p1];
    const p2 = r.sketch.points[l.p2];
    expect(p1.x).toBeCloseTo(0, 6);
    expect(p1.y).toBeCloseTo(0, 6);
    expect(p2.y).toBeCloseTo(0, 6);
    expect(Math.abs(p2.x)).toBeCloseTo(25, 6);
  });

  it('rectangle with dimensions is fully defined', () => {
    let s = createSketch('s', 'Sketch1');
    let a, b, c, d;
    [s, a] = addLine(s, { x: 0, y: 0 }, { x: 30, y: 1 });
    [s, b] = addLine(s, a.p2, { x: 31, y: 20 });
    [s, c] = addLine(s, b.p2, { x: -1, y: 21 });
    [s, d] = addLine(s, c.p2, a.p1);
    [s] = addConstraint(s, 'horizontal', [a.id]);
    [s] = addConstraint(s, 'vertical', [b.id]);
    [s] = addConstraint(s, 'horizontal', [c.id]);
    [s] = addConstraint(s, 'vertical', [d.id]);
    [s] = addConstraint(s, 'coincident', [a.p1, s.origin]);
    [s] = addConstraint(s, 'length', [a.id], { value: 40 });
    [s] = addConstraint(s, 'length', [b.id], { value: 20 });
    const r = solveSketch(s);
    expect(r.status).toBe('full');
    expect(r.dof).toBe(0);
    expect(lineLength(r.sketch, a)).toBeCloseTo(40, 6);
    expect(lineLength(r.sketch, b)).toBeCloseTo(20, 6);
    expect(lineLength(r.sketch, c)).toBeCloseTo(40, 6);
    expect(lineLength(r.sketch, d)).toBeCloseTo(20, 6);
  });

  it('rectangle without width dimension has 1 dof and is under-defined', () => {
    let s = createSketch('s', 'Sketch1');
    let a, b, c;
    [s, a] = addLine(s, { x: 0, y: 0 }, { x: 30, y: 0 });
    [s, b] = addLine(s, a.p2, { x: 30, y: 20 });
    [s, c] = addLine(s, b.p2, { x: 0, y: 20 });
    [s] = addLine(s, c.p2, a.p1);
    [s] = addConstraint(s, 'horizontal', [a.id]);
    [s] = addConstraint(s, 'vertical', [b.id]);
    [s] = addConstraint(s, 'horizontal', [c.id]);
    [s] = addConstraint(s, 'vertical', [s.entityOrder[3]]);
    [s] = addConstraint(s, 'coincident', [a.p1, s.origin]);
    [s] = addConstraint(s, 'length', [b.id], { value: 20 });
    const r = solveSketch(s);
    expect(r.status).toBe('under');
    expect(r.dof).toBe(1);
    expect(r.entityStatus[a.id]).toBe('under');
  });

  it('detects redundant (over-defined) constraints', () => {
    let s = createSketch('s', 'Sketch1');
    let l, c1;
    [s, l] = addLine(s, { x: 0, y: 0 }, { x: 10, y: 0 });
    [s] = addConstraint(s, 'coincident', [l.p1, s.origin]);
    [s] = addConstraint(s, 'horizontal', [l.id]);
    [s, c1] = addConstraint(s, 'length', [l.id], { value: 10 });
    let c2;
    [s, c2] = addConstraint(s, 'hDistance', [l.p1, l.p2], { value: 10 });
    const r = solveSketch(s);
    expect(r.status).toBe('over');
    expect(['redundant', 'conflicting']).toContain(r.constraintStatus[c2.id]);
    expect(r.entityStatus[l.id]).toBe('over');
    expect(r.constraintStatus[c1.id]).toBeDefined();
  });

  it('detects conflicting constraints', () => {
    let s = createSketch('s', 'Sketch1');
    let l;
    [s, l] = addLine(s, { x: 0, y: 0 }, { x: 10, y: 0 });
    [s] = addConstraint(s, 'length', [l.id], { value: 10 });
    let c2;
    [s, c2] = addConstraint(s, 'length', [l.id], { value: 12 });
    const r = solveSketch(s);
    expect(r.status).toBe('conflict');
    expect(r.constraintStatus[c2.id]).toBe('conflicting');
  });

  it('driven dimensions are not solved and do not count', () => {
    let s = createSketch('s', 'Sketch1');
    let l;
    [s, l] = addLine(s, { x: 0, y: 0 }, { x: 10, y: 0 });
    [s] = addConstraint(s, 'length', [l.id], { value: 10 });
    let c2;
    [s, c2] = addConstraint(s, 'length', [l.id], { value: 12, driven: true });
    const r = solveSketch(s);
    expect(r.status).toBe('under');
    expect(r.constraintStatus[c2.id]).toBe('driven');
    expect(lineLength(r.sketch, l)).toBeCloseTo(10, 6);
  });
});

describe('solver: relations', () => {
  it('tangent line to circle', () => {
    let s = createSketch('s', 'Sketch1');
    let c, l;
    [s, c] = addCircle(s, { x: 0, y: 0 }, 5);
    [s] = addConstraint(s, 'coincident', [c.center, s.origin]);
    [s] = addConstraint(s, 'radius', [c.id], { value: 5 });
    [s, l] = addLine(s, { x: -10, y: 4 }, { x: 10, y: 4.5 });
    [s] = addConstraint(s, 'horizontal', [l.id]);
    [s] = addConstraint(s, 'tangent', [l.id, c.id]);
    const r = solveSketch(s);
    expect(r.residual).toBeLessThan(1e-6);
    expect(Math.abs(r.sketch.points[l.p1].y)).toBeCloseTo(5, 6);
  });

  it('tangent circle to circle (external)', () => {
    let s = createSketch('s', 'Sketch1');
    let a, b;
    [s, a] = addCircle(s, { x: 0, y: 0 }, 5);
    [s, b] = addCircle(s, { x: 12, y: 0 }, 3);
    [s] = addConstraint(s, 'coincident', [a.center, s.origin]);
    [s] = addConstraint(s, 'radius', [a.id], { value: 5 });
    [s] = addConstraint(s, 'radius', [b.id], { value: 3 });
    [s] = addConstraint(s, 'horizontal', [a.center, b.center]);
    [s] = addConstraint(s, 'tangent', [a.id, b.id]);
    const r = solveSketch(s);
    expect(r.status).toBe('full');
    expect(Math.abs(r.sketch.points[b.center].x)).toBeCloseTo(8, 6);
  });

  it('equal lengths and equal radii', () => {
    let s = createSketch('s', 'Sketch1');
    let a, b, c1, c2;
    [s, a] = addLine(s, { x: 0, y: 0 }, { x: 10, y: 0 });
    [s, b] = addLine(s, { x: 0, y: 5 }, { x: 7, y: 5 });
    [s] = addConstraint(s, 'equal', [a.id, b.id]);
    [s, c1] = addCircle(s, { x: 0, y: 0 }, 5);
    [s, c2] = addCircle(s, { x: 20, y: 0 }, 2);
    [s] = addConstraint(s, 'equal', [c1.id, c2.id]);
    [s] = addConstraint(s, 'radius', [c1.id], { value: 5 });
    const r = solveSketch(s);
    expect(lineLength(r.sketch, a)).toBeCloseTo(lineLength(r.sketch, b), 6);
    expect(r.sketch.scalars[c2.r]).toBeCloseTo(5, 6);
  });

  it('symmetric points about a vertical axis', () => {
    let s = createSketch('s', 'Sketch1');
    let axis, p, q;
    [s, axis] = addLine(s, { x: 0, y: -10 }, { x: 0, y: 10 }, true);
    [s] = addConstraint(s, 'coincident', [axis.p1, s.origin]);
    [s] = addConstraint(s, 'vertical', [axis.id]);
    [s] = addConstraint(s, 'length', [axis.id], { value: 20 });
    [s, p] = addPoint(s, { x: -4, y: 3 });
    [s, q] = addPoint(s, { x: 5, y: 2 });
    [s] = addConstraint(s, 'symmetric', [p.id, q.id, axis.id]);
    [s] = addConstraint(s, 'fix', [p.id], { target: { x: -4, y: 3 } });
    const r = solveSketch(s);
    expect(r.status).toBe('full');
    expect(r.sketch.points[q.p].x).toBeCloseTo(4, 6);
    expect(r.sketch.points[q.p].y).toBeCloseTo(3, 6);
  });

  it('angle, parallel, perpendicular, midpoint, concentric', () => {
    let s = createSketch('s', 'Sketch1');
    let a, b, c, m, c1, c2;
    [s, a] = addLine(s, { x: 0, y: 0 }, { x: 10, y: 0 });
    [s] = addConstraint(s, 'coincident', [a.p1, s.origin]);
    [s] = addConstraint(s, 'horizontal', [a.id]);
    [s] = addConstraint(s, 'length', [a.id], { value: 10 });
    [s, b] = addLine(s, a.p1, { x: 5, y: 5 });
    [s] = addConstraint(s, 'angle', [a.id, b.id], { value: 30 });
    [s] = addConstraint(s, 'length', [b.id], { value: 10 });
    [s, c] = addLine(s, { x: 0, y: 5 }, { x: 10, y: 6 });
    [s] = addConstraint(s, 'parallel', [a.id, c.id]);
    [s, m] = addPoint(s, { x: 4, y: 1 });
    [s] = addConstraint(s, 'midpoint', [m.id, a.id]);
    [s, c1] = addCircle(s, { x: 1, y: 1 }, 2);
    [s, c2] = addCircle(s, { x: 3, y: 2 }, 4);
    [s] = addConstraint(s, 'concentric', [c1.id, c2.id]);
    const r = solveSketch(s);
    expect(r.residual).toBeLessThan(1e-6);
    const p2 = r.sketch.points[b.p2];
    expect(p2.x).toBeCloseTo(10 * Math.cos(Math.PI / 6), 5);
    expect(p2.y).toBeCloseTo(10 * Math.sin(Math.PI / 6), 5);
    expect(r.sketch.points[c.p1].y).toBeCloseTo(r.sketch.points[c.p2].y, 6);
    expect(r.sketch.points[m.p].x).toBeCloseTo(5, 6);
    expect(r.sketch.points[c1.center].x).toBeCloseTo(r.sketch.points[c2.center].x, 6);
  });

  it('arc keeps its end points on the radius and accepts radius dimension', () => {
    let s = createSketch('s', 'Sketch1');
    let arc;
    [s, arc] = addArc(s, { x: 0, y: 0 }, { x: 5, y: 0 }, { x: 0, y: 5 });
    [s] = addConstraint(s, 'coincident', [arc.center, s.origin]);
    [s] = addConstraint(s, 'radius', [arc.id], { value: 8 });
    const r = solveSketch(s);
    expect(r.residual).toBeLessThan(1e-6);
    const c = r.sketch.points[arc.center];
    const st = r.sketch.points[arc.start];
    expect(Math.hypot(st.x - c.x, st.y - c.y)).toBeCloseTo(8, 6);
  });
});

describe('solver: dragging', () => {
  it('drag moves a free point and keeps constraints', () => {
    let s = createSketch('s', 'Sketch1');
    let l;
    [s, l] = addLine(s, { x: 0, y: 0 }, { x: 10, y: 0 });
    [s] = addConstraint(s, 'coincident', [l.p1, s.origin]);
    [s] = addConstraint(s, 'length', [l.id], { value: 10 });
    const r = solveSketch(s, { drag: { point: l.p2, target: { x: 0, y: 12 } } });
    expect(lineLength(r.sketch, l)).toBeCloseTo(10, 6);
    const p = r.sketch.points[l.p2];
    expect(p.x).toBeCloseTo(0, 4);
    expect(p.y).toBeCloseTo(10, 4);
  });
});

describe('solver: doubled distance', () => {
  it('a doubled distance to a centerline puts the point at half the value from it (a diameter)', () => {
    let s = createSketch('s', 'Sketch1');
    let cl, p;
    [s, cl] = addLine(s, { x: 0, y: -20 }, { x: 0, y: 20 }, true);
    [s, p] = addPoint(s, { x: 10, y: 0 });
    [s] = addConstraint(s, 'distance', [p.id, cl.id], { value: 50, doubled: true });
    const r = solveSketch(s);
    const q = r.sketch.points[p.p], a = r.sketch.points[cl.p1], b = r.sketch.points[cl.p2];
    const d = Math.abs((b.x - a.x) * (q.y - a.y) - (b.y - a.y) * (q.x - a.x)) / Math.hypot(b.x - a.x, b.y - a.y);
    expect(d).toBeCloseTo(25, 6);
  });
});
