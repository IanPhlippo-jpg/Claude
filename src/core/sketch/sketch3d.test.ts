import { describe, expect, it } from 'vitest';
import { addAlong, dimsWithoutLine, endPoints3D, measure3D, solve3D, type Dim3D, type P3, type Relation3D, type Seg3 } from './sketch3d';

const near = (p: P3, q: P3, tol = 1e-6) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) < tol;
const len = (s: Seg3) => Math.hypot(s[1][0] - s[0][0], s[1][1] - s[0][1], s[1][2] - s[0][2]);

describe('3D sketch dimensions', () => {
  it('a line from the origin Along Z with length 30 is fully defined', () => {
    const a = addAlong([[[0, 0, 0], [3, 4, 25]]], [], 0, 'alongZ');
    const r = solve3D(a.segments, a.relations, [{ kind: 'length', line: 0, value: 30 }]);
    expect(r.ok).toBe(true);
    expect(near(r.segments[0][1], [0, 0, 30])).toBe(true);
    expect(r.status).toBe('full');
    expect(r.dof).toBe(0);
  });

  it('without the dimension the line is under defined with one degree of freedom', () => {
    const r = solve3D([[[0, 0, 0], [0, 0, 25]]], [{ kind: 'alongZ', line: 0 }], []);
    expect(r.status).toBe('under');
    expect(r.dof).toBe(1);
  });

  it('a free line from the origin with a length keeps two degrees of freedom', () => {
    const r = solve3D([[[0, 0, 0], [10, 0, 0]]], [], [{ kind: 'length', line: 0, value: 10 }]);
    expect(r.status).toBe('under');
    expect(r.dof).toBe(2);
  });

  it('an L of two lines (Along Z 30, Along X 40) with two dimensions is fully defined', () => {
    const segs: Seg3[] = [[[0, 0, 0], [0, 0, 30]], [[0, 0, 30], [40, 0, 30]]];
    const rels: Relation3D[] = [{ kind: 'alongZ', line: 0 }, { kind: 'alongX', line: 1 }];
    const r = solve3D(segs, rels, [{ kind: 'length', line: 0, value: 30 }, { kind: 'length', line: 1, value: 40 }]);
    expect(r.status).toBe('full');
  });

  it('a second dimension on a fully defined line is over defined; one that disagrees is a conflict', () => {
    const segs: Seg3[] = [[[0, 0, 0], [0, 0, 30]]];
    const rels: Relation3D[] = [{ kind: 'alongZ', line: 0 }];
    const dims: Dim3D[] = [{ kind: 'length', line: 0, value: 30 }, { kind: 'distance', a: [0, 0], b: [0, 1], value: 30 }];
    expect(solve3D(segs, rels, dims).status).toBe('over');
    const bad = solve3D(segs, rels, [dims[0], { ...dims[1], value: 20 } as Dim3D]);
    expect(bad.ok).toBe(false);
    expect(bad.status).toBe('conflict');
  });

  it('a changed value moves the end of the line, the origin stays', () => {
    const r = solve3D([[[0, 0, 0], [0, 0, 30]]], [{ kind: 'alongZ', line: 0 }], [{ kind: 'length', line: 0, value: 45 }]);
    expect(r.ok).toBe(true);
    expect(near(r.segments[0][0], [0, 0, 0])).toBe(true);
    expect(near(r.segments[0][1], [0, 0, 45])).toBe(true);
  });

  it('a distance between two end points holds while dimensioned points elsewhere follow', () => {
    const segs: Seg3[] = [[[0, 0, 0], [20, 0, 0]], [[20, 0, 0], [20, 30, 0]]];
    const r = solve3D(segs, [], [{ kind: 'distance', a: [0, 0], b: [1, 1], value: 50 }]);
    expect(r.ok).toBe(true);
    expect(Math.hypot(...r.segments[1][1])).toBeCloseTo(50, 6);
    expect(measure3D(r.segments, { kind: 'distance', a: [0, 0], b: [1, 1], value: 0 })).toBeCloseTo(50, 6);
  });

  it('dragging an end point keeps the dimensions: the point goes where asked when it can', () => {
    const segs: Seg3[] = [[[0, 0, 0], [0, 0, 30]], [[0, 0, 30], [40, 0, 30]]];
    const rels: Relation3D[] = [{ kind: 'alongZ', line: 0 }];
    const dims: Dim3D[] = [{ kind: 'length', line: 1, value: 40 }];
    const r = solve3D(segs, rels, dims, { from: [40, 0, 30], to: [0, 30, 30] });
    expect(r.ok).toBe(true);
    expect(near(r.segments[1][1], [0, 30, 30])).toBe(true);
    expect(len(r.segments[1])).toBeCloseTo(40, 6);
    // the corner stays on the Z axis through the origin, the first line still starts there
    expect(near(r.segments[0][0], [0, 0, 0])).toBe(true);
    expect(Math.abs(r.segments[0][1][0]) + Math.abs(r.segments[0][1][1])).toBeLessThan(1e-6);
  });

  it('a drag the dimensions forbid leaves the point as near as they allow, the length held', () => {
    const segs: Seg3[] = [[[0, 0, 0], [0, 0, 30]], [[0, 0, 30], [40, 0, 30]]];
    const r = solve3D(segs, [{ kind: 'alongZ', line: 0 }], [{ kind: 'length', line: 1, value: 40 }], { from: [40, 0, 30], to: [10, 50, 30] });
    expect(len(r.segments[1])).toBeCloseTo(40, 6);
  });

  it('a fully defined line does not move when its end is dragged', () => {
    const segs: Seg3[] = [[[0, 0, 0], [0, 0, 30]]];
    const r = solve3D(segs, [{ kind: 'alongZ', line: 0 }], [{ kind: 'length', line: 0, value: 30 }], { from: [0, 0, 30], to: [5, 5, 50] });
    expect(near(r.segments[0][1], [0, 0, 30])).toBe(true);
    expect(r.status).toBe('full');
  });

  it('Undo last line drops the dimensions of that line and renumbers the rest', () => {
    const dims: Dim3D[] = [{ kind: 'length', line: 0, value: 1 }, { kind: 'length', line: 1, value: 2 }, { kind: 'distance', a: [0, 0], b: [2, 1], value: 3 }, { kind: 'length', line: 2, value: 4 }];
    expect(dimsWithoutLine(dims, 1)).toEqual([{ kind: 'length', line: 0, value: 1 }, { kind: 'distance', a: [0, 0], b: [1, 1], value: 3 }, { kind: 'length', line: 1, value: 4 }]);
  });

  it('end points are listed once', () => {
    expect(endPoints3D([[[0, 0, 0], [1, 0, 0]], [[1, 0, 0], [1, 1, 0]]]).map((e) => e.ref)).toEqual([[0, 0], [0, 1], [1, 1]]);
  });
});
