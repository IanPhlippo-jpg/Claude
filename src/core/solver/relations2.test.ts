import { describe, expect, it } from 'vitest';
import { addArc, addConstraint, addLine, createSketch } from '../sketch/model';
import { solveSketch } from './solver';

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
