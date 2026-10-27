import { describe, expect, it } from 'vitest';
import { addArc, addCircle, addLine, createSketch } from './model';
import { segmentEntity } from './edit';

describe('Segment', () => {
  it('puts n − 1 points evenly on a line, held on it', () => {
    const [s, l] = addLine(createSketch('s', 'S', 'top'), { x: 0, y: 0 }, { x: 40, y: 0 });
    const out = segmentEntity(s, l.id, 4, 'points');
    const pts = out.entityOrder.map((id) => out.entities[id]).filter((e) => e.kind === 'point');
    expect(pts.map((e) => (e.kind === 'point' ? Math.round(out.points[e.p].x) : 0))).toEqual([10, 20, 30]);
    expect(Object.values(out.constraints).filter((c) => c.kind === 'pointOnEntity')).toHaveLength(3);
  });

  it('cuts a line into n collinear segments that keep its ends', () => {
    const [s, l] = addLine(createSketch('s', 'S', 'top'), { x: 0, y: 0 }, { x: 30, y: 0 });
    const out = segmentEntity(s, l.id, 3, 'segments');
    const lines = out.entityOrder.map((id) => out.entities[id]).filter((e) => e.kind === 'line');
    expect(lines).toHaveLength(3);
    const span = lines.map((e) => (e.kind === 'line' ? [out.points[e.p1].x, out.points[e.p2].x] : [])).sort((a, b) => a[0] - b[0]);
    expect(span.map((x) => x.map(Math.round))).toEqual([[0, 10], [10, 20], [20, 30]]);
    expect(Object.values(out.constraints).filter((c) => c.kind === 'collinear')).toHaveLength(2);
  });

  it('divides a circle by n points and an arc into coradial pieces', () => {
    const [s, c] = addCircle(createSketch('s', 'S', 'top'), { x: 0, y: 0 }, 10);
    const out = segmentEntity(s, c.id, 6, 'points');
    expect(out.entityOrder.filter((id) => out.entities[id].kind === 'point')).toHaveLength(6);
    const [s2, a] = addArc(createSketch('s', 'S', 'top'), { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 10 });
    const out2 = segmentEntity(s2, a.id, 2, 'segments');
    expect(out2.entityOrder.filter((id) => out2.entities[id].kind === 'arc')).toHaveLength(2);
    expect(Object.values(out2.constraints).filter((k) => k.kind === 'coradial')).toHaveLength(1);
  });
});
