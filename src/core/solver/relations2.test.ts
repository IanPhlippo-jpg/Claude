import { describe, expect, it } from 'vitest';
import { addArc, addConstraint, addLine, addPoint, addSpline, createSketch } from '../sketch/model';
import { relationsForSelection } from '../sketch/relations';
import { solveSketch } from './solver';
import { addAlong, alongOf, drag3DPoint, withoutLine, type Relation3D, type Seg3 } from '../sketch/sketch3d';

describe('Coradial and Equal Curve Length', () => {
  it('coradial makes two arcs share centre and radius', () => {
    let s = createSketch('s', 'Sketch1');
    let a, b;
    [s, a] = addArc(s, { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 10 }, true);
    [s, b] = addArc(s, { x: 3, y: 2 }, { x: 8, y: 2 }, { x: 3, y: 7 }, true);
    [s] = addConstraint(s, 'coradial', [a.id, b.id]);
    const r = solveSketch(s);
    const sk = r.sketch;
    const ca = sk.points[a.center], cb = sk.points[b.center];
    expect(Math.hypot(ca.x - cb.x, ca.y - cb.y)).toBeLessThan(1e-4);
    expect(Math.abs(sk.scalars[a.r] - sk.scalars[b.r])).toBeLessThan(1e-4);
  });

  it('equal curve length matches a line to an arc', () => {
    let s = createSketch('s', 'Sketch1');
    let l, a;
    [s, l] = addLine(s, { x: 0, y: -20 }, { x: 30, y: -20 });
    [s, a] = addArc(s, { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 10 }, true);
    [s] = addConstraint(s, 'fix', [l.p1]);
    [s] = addConstraint(s, 'fix', [l.p2]);
    [s] = addConstraint(s, 'equalCurveLength', [l.id, a.id]);
    const sk = solveSketch(s).sketch;
    const C = sk.points[a.center], S = sk.points[a.start], E = sk.points[a.end];
    const a0 = Math.atan2(S.y - C.y, S.x - C.x), a1 = Math.atan2(E.y - C.y, E.x - C.x);
    let sw = a1 - a0;
    while (sw < 0) sw += Math.PI * 2;
    expect(Math.abs(sk.scalars[a.r] * sw - 30)).toBeLessThan(1e-3);
  });
});

describe('Intersection, Merge and Equal Curvature (QA v0.5.1 F123)', () => {
  it('Intersection puts a point on the crossing of two lines', () => {
    let s = createSketch('s', 'Sketch1');
    let l1, l2, p;
    [s, l1] = addLine(s, { x: 0, y: 0 }, { x: 10, y: 10 });
    [s, l2] = addLine(s, { x: 0, y: 10 }, { x: 10, y: 0 });
    for (const q of [l1.p1, l1.p2, l2.p1, l2.p2]) [s] = addConstraint(s, 'fix', [q]);
    [s, p] = addPoint(s, { x: 2, y: 7 });
    expect(relationsForSelection(s, [{ kind: 'entity', id: p.id }, { kind: 'entity', id: l1.id }, { kind: 'entity', id: l2.id }]).map((o) => o.kind)).toContain('intersection');
    [s] = addConstraint(s, 'intersection', [p.id, l1.id, l2.id]);
    const sk = solveSketch(s).sketch;
    expect(sk.points[p.p].x).toBeCloseTo(5, 4);
    expect(sk.points[p.p].y).toBeCloseTo(5, 4);
  });

  it('Merge brings two end points together', () => {
    let s = createSketch('s', 'Sketch1');
    let a, b;
    [s, a] = addLine(s, { x: 0, y: 0 }, { x: 10, y: 0 });
    [s, b] = addLine(s, { x: 11, y: 1 }, { x: 20, y: 5 });
    [s] = addConstraint(s, 'fix', [a.p1]);
    [s] = addConstraint(s, 'fix', [a.p2]);
    expect(relationsForSelection(s, [{ kind: 'point', id: a.p2 }, { kind: 'point', id: b.p1 }]).map((o) => o.kind)).toContain('merge');
    [s] = addConstraint(s, 'merge', [a.p2, b.p1]);
    const sk = solveSketch(s).sketch;
    expect(Math.hypot(sk.points[b.p1].x - 10, sk.points[b.p1].y)).toBeLessThan(1e-4);
  });

  it('Equal Curvature: a spline leaves a line straight and an arc on its circle', () => {
    let s = createSketch('s', 'Sketch1');
    let l, sp;
    [s, l] = addLine(s, { x: 0, y: 0 }, { x: 10, y: 0 });
    [s] = addConstraint(s, 'fix', [l.p1]);
    [s] = addConstraint(s, 'fix', [l.p2]);
    [s, sp] = addSpline(s, [l.p2, { x: 15, y: 3 }, { x: 20, y: 8 }, { x: 25, y: 15 }]);
    expect(relationsForSelection(s, [{ kind: 'entity', id: sp.id }, { kind: 'entity', id: l.id }]).map((o) => o.kind)).toContain('equalCurvature');
    [s] = addConstraint(s, 'equalCurvature', [sp.id, l.id]);
    let sk = solveSketch(s).sketch;
    expect(Math.abs(sk.points[sp.points[1]].y)).toBeLessThan(1e-4);
    expect(Math.abs(sk.points[sp.points[2]].y)).toBeLessThan(1e-4);

    let t = createSketch('t', 'Sketch2');
    let a, sp2;
    [t, a] = addArc(t, { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 10 }, true);
    for (const q of [a.center, a.start, a.end]) [t] = addConstraint(t, 'fix', [q]);
    // the spline starts at the arc's end and is drawn the other way round
    [t, sp2] = addSpline(t, [{ x: -12, y: 4 }, { x: -6, y: 9 }, { x: -3, y: 11 }, a.end]);
    [t] = addConstraint(t, 'equalCurvature', [sp2.id, a.id]);
    sk = solveSketch(t).sketch;
    for (const i of [1, 2]) { const q = sk.points[sp2.points[i]]; expect(Math.hypot(q.x, q.y)).toBeCloseTo(10, 3); }
  });
});

describe('Along X / Y / Z in a 3D sketch (QA 0.5.11 P2-5, F123)', () => {
  // a vertical post (0,0,0)-(0,0,10) and an arm from its top along x
  const post: Seg3 = [[0, 0, 0], [0, 0, 10]], arm: Seg3 = [[0, 0, 10], [8, 0, 10]];
  it('AlongZ keeps x and y of both end points of the line equal when one end is dragged', () => {
    const rels: Relation3D[] = [{ kind: 'alongZ', line: 0 }];
    const out = drag3DPoint([post, arm], rels, [0, 0, 10], [3, 4, 12]);
    const [p, q] = out.segments[0];
    expect(p[0]).toBeCloseTo(q[0], 9);
    expect(p[1]).toBeCloseTo(q[1], 9);
    expect(q).toEqual([3, 4, 12]);
    // the start keeps its z, the line stays along Z
    expect(p).toEqual([3, 4, 0]);
    expect(alongOf(out.segments[0])).toBe('alongZ');
    // the arm without a relation follows its shared end and keeps its own far end
    expect(out.segments[1]).toEqual([[3, 4, 12], [8, 0, 10]]);
    // dragged from the other end the same holds
    const back = drag3DPoint(out.segments, rels, [3, 4, 0], [-1, 2, -5]);
    expect(back.segments[0]).toEqual([[-1, 2, -5], [-1, 2, 12]]);
  });
  it('relations tie over shared points: AlongZ on the post and AlongX on the arm move the arm end with the post', () => {
    const rels: Relation3D[] = [{ kind: 'alongZ', line: 0 }, { kind: 'alongX', line: 1 }];
    const out = drag3DPoint([post, arm], rels, [0, 0, 0], [2, 5, 1]);
    expect(out.segments).toEqual([[[2, 5, 1], [2, 5, 10]], [[2, 5, 10], [8, 5, 10]]]);
    expect(out.segments.map(alongOf)).toEqual(['alongZ', 'alongX']);
  });
  it('adding AlongY to a slanted line brings its end onto the Y axis through its start; the last line undone drops its relation', () => {
    const slant: Seg3 = [[1, 1, 1], [4, 9, 3]];
    const r = addAlong([slant], [], 0, 'alongY');
    expect(r.segments[0]).toEqual([[1, 1, 1], [1, 9, 1]]);
    expect(r.relations).toEqual([{ kind: 'alongY', line: 0 }]);
    // a second relation on the line replaces the first
    expect(addAlong(r.segments, r.relations, 0, 'alongX').relations).toEqual([{ kind: 'alongX', line: 0 }]);
    expect(withoutLine([{ kind: 'alongZ', line: 0 }, { kind: 'alongX', line: 1 }], 1)).toEqual([{ kind: 'alongZ', line: 0 }]);
  });
});
