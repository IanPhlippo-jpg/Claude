import { describe, expect, it } from 'vitest';
import { addCircle, addLine, addPoint, createSketch } from './model';
import { dimensionForSelection, measure, relationsForSelection } from './relations';

describe('relations for selection', () => {
  it('offers context-sensitive relations', () => {
    let s = createSketch('s', 'S');
    let l1, l2, c, p;
    [s, l1] = addLine(s, { x: 0, y: 0 }, { x: 10, y: 0 });
    [s, l2] = addLine(s, { x: 0, y: 5 }, { x: 10, y: 6 });
    [s, c] = addCircle(s, { x: 0, y: 20 }, 3);
    [s, p] = addPoint(s, { x: 1, y: 1 });
    const kinds = (sel: Parameters<typeof relationsForSelection>[1]) => relationsForSelection(s, sel).map((r) => r.kind);
    expect(kinds([{ kind: 'entity', id: l1.id }])).toEqual(['horizontal', 'vertical']);
    expect(kinds([{ kind: 'entity', id: l1.id }, { kind: 'entity', id: l2.id }])).toEqual(['parallel', 'perpendicular', 'equal', 'collinear']);
    expect(kinds([{ kind: 'entity', id: l1.id }, { kind: 'entity', id: c.id }])).toEqual(['tangent']);
    expect(kinds([{ kind: 'point', id: l1.p1 }, { kind: 'point', id: l2.p1 }])).toEqual(['coincident', 'horizontal', 'vertical', 'merge']);
    expect(kinds([{ kind: 'entity', id: p.id }, { kind: 'entity', id: l1.id }])).toEqual(['pointOnEntity', 'midpoint']);
    expect(kinds([{ kind: 'point', id: l1.p1 }, { kind: 'point', id: l1.p2 }, { kind: 'entity', id: l2.id }])).toEqual(['symmetric']);
  });

  it('picks the smart dimension and measures it', () => {
    let s = createSketch('s', 'S');
    let l1, l2, c;
    [s, l1] = addLine(s, { x: 0, y: 0 }, { x: 10, y: 0 });
    [s, l2] = addLine(s, { x: 0, y: 0 }, { x: 0, y: 7 });
    [s, c] = addCircle(s, { x: 0, y: 20 }, 3);
    const d1 = dimensionForSelection(s, [{ kind: 'entity', id: l1.id }])!;
    expect(d1.kind).toBe('length');
    expect(measure(s, d1)).toBeCloseTo(10);
    const d2 = dimensionForSelection(s, [{ kind: 'entity', id: c.id }])!;
    expect(d2.kind).toBe('diameter');
    expect(measure(s, d2)).toBeCloseTo(6);
    const d3 = dimensionForSelection(s, [{ kind: 'entity', id: l1.id }, { kind: 'entity', id: l2.id }])!;
    expect(d3.kind).toBe('angle');
    expect(measure(s, d3)).toBeCloseTo(90);
    const d4 = dimensionForSelection(s, [{ kind: 'point', id: l1.p2 }, { kind: 'entity', id: l2.id }])!;
    expect(d4.kind).toBe('distance');
    expect(measure(s, d4)).toBeCloseTo(10);
  });
});

import { addPolygon, mirrorEntities } from './model';
import { solveSketch } from '../solver/solver';

describe('polygon and mirror', () => {
  it('builds a regular hexagon that stays regular when solved', () => {
    let s = createSketch('s', 'S');
    let lines;
    [s, lines] = addPolygon(s, { x: 0, y: 0 }, 10, 6);
    expect(lines.length).toBe(6);
    const r = solveSketch(s);
    expect(r.residual).toBeLessThan(1e-6);
    expect(r.status).not.toBe('conflict');
  });
  it('mirrors a line about an axis with symmetric relations', () => {
    let s = createSketch('s', 'S');
    let axis, l;
    [s, axis] = addLine(s, { x: 0, y: -10 }, { x: 0, y: 10 }, true);
    [s, l] = addLine(s, { x: 2, y: 1 }, { x: 5, y: 4 });
    s = mirrorEntities(s, [l.id], axis.id);
    expect(s.entityOrder.length).toBe(3);
    const m = s.entities[s.entityOrder[2]] as { p1: string; p2: string };
    expect(s.points[m.p1].x).toBeCloseTo(-2);
    expect(s.points[m.p2].x).toBeCloseTo(-5);
    expect(Object.values(s.constraints).filter((c) => c.kind === 'symmetric').length).toBe(1);
    expect(solveSketch(s).residual).toBeLessThan(1e-6);
  });
});
