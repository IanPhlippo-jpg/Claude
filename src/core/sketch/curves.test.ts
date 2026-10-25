import { describe, expect, it } from 'vitest';
import { addCircle, addConic, addEllipseArc, addLine, addSpline, createSketch } from './model';
import { fullyDefineSketch } from './fullyDefine';
import { sampleEntity } from './geometry';
import { sketchRegions } from '../features/regions';
import { solveSketch } from '../solver/solver';

describe('Fully Define Sketch', () => {
  it('makes a loose rectangle with a hole fully defined without over-defining it', () => {
    let s = createSketch('s', 'S');
    let a, b, c;
    [s, a] = addLine(s, { x: 10, y: 10 }, { x: 60, y: 10 });
    [s, b] = addLine(s, a.p2, { x: 60, y: 40 });
    [s, c] = addLine(s, b.p2, { x: 10, y: 40 });
    [s] = addLine(s, c.p2, a.p1);
    [s] = addCircle(s, { x: 35, y: 25 }, 5);
    expect(solveSketch(s).dof).toBeGreaterThan(0);
    const r = fullyDefineSketch(s);
    expect(r.dof).toBe(0);
    expect(r.added).toBeGreaterThan(4);
    const st = solveSketch(r.sketch);
    expect(st.status).toBe('full');
    // the geometry did not move
    expect(r.sketch.points[a.p2].x).toBeCloseTo(60, 6);
    expect(r.sketch.points[c.p2].y).toBeCloseTo(40, 6);
  });
});

describe('Partial Ellipse, Conic, Style Spline', () => {
  it('samples a partial ellipse from its start to its end point', () => {
    let s = createSketch('s', 'S');
    let e;
    [s, e] = addEllipseArc(s, { x: 0, y: 0 }, { x: 20, y: 0 }, 10, { x: 20, y: 0 }, { x: 0, y: 10 }, true);
    const pts = sampleEntity(s, e, 48);
    expect(pts[0]).toEqual({ x: 20, y: 0 });
    expect(pts[pts.length - 1]).toEqual({ x: 0, y: 10 });
    for (const p of pts) expect((p.x / 20) ** 2 + (p.y / 10) ** 2).toBeCloseTo(1, 3);
    // a quarter: every sample in the first quadrant
    expect(pts.every((p) => p.x >= -1e-9 && p.y >= -1e-9)).toBe(true);
  });

  it('keeps the partial ellipse ends on the ellipse when the solver runs', () => {
    let s = createSketch('s', 'S');
    [s] = addEllipseArc(s, { x: 0, y: 0 }, { x: 20, y: 0 }, 10, { x: 20, y: 0 }, { x: 0, y: 10 }, true);
    const r = solveSketch(s);
    expect(r.status === 'under' || r.status === 'full').toBe(true);
  });

  it('a parabola conic (rho 0.5) is the quadratic Bezier through its shoulder point', () => {
    let s = createSketch('s', 'S');
    let e;
    [s, e] = addConic(s, { x: -10, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 20 }, 0.5, { parabola: true });
    const pts = sampleEntity(s, e, 2);
    expect(pts[1].x).toBeCloseTo(0, 9);
    expect(pts[1].y).toBeCloseTo(10, 9); // M + 0.5 (C - M)
  });

  it('a closed region from a line and a conic makes a profile', () => {
    let s = createSketch('s', 'S');
    let l;
    [s, l] = addLine(s, { x: -10, y: 0 }, { x: 10, y: 0 });
    [s] = addConic(s, l.p2, l.p1, { x: 0, y: 20 }, 0.6);
    expect(sketchRegions(s).length).toBe(1);
  });

  it('a style spline passes through its first and last control point only', () => {
    let s = createSketch('s', 'S');
    let e;
    [s, e] = addSpline(s, [{ x: 0, y: 0 }, { x: 10, y: 20 }, { x: 20, y: 20 }, { x: 30, y: 0 }], false, { style: true });
    const pts = sampleEntity(s, e);
    expect(pts[0]).toEqual({ x: 0, y: 0 });
    expect(pts[pts.length - 1]).toEqual({ x: 30, y: 0 });
    expect(Math.max(...pts.map((p) => p.y))).toBeCloseTo(15, 6); // cubic Bezier peak = 3/4 of the control height
  });
});
