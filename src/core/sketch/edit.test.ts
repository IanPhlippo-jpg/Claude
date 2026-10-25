import { describe, expect, it } from 'vitest';
import { addCircle, addLine, createSketch } from './model';
import { circularSketchPattern, convertPolylines, extendEntity, linearSketchPattern, offsetEntities, rotateAbout, sketchChamfer, sketchFillet, transformEntities, translate, trimEntity } from './edit';
import type { ArcEntity, CircleEntity, LineEntity } from './types';

const kinds = (s: ReturnType<typeof createSketch>) => s.entityOrder.map((id) => s.entities[id].kind);
const lines = (s: ReturnType<typeof createSketch>) => s.entityOrder.map((id) => s.entities[id]).filter((e): e is LineEntity => e.kind === 'line');

describe('sketch editing', () => {
  it('Trim: a line crossed by two others loses only the middle part', () => {
    let s = createSketch('s', 'Sketch1', 'front');
    const [s1, l] = addLine(s, { x: 0, y: 0 }, { x: 30, y: 0 });
    s = addLine(s1, { x: 10, y: -5 }, { x: 10, y: 5 })[0];
    s = addLine(s, { x: 20, y: -5 }, { x: 20, y: 5 })[0];
    const t = trimEntity(s, l.id, { x: 15, y: 0 });
    expect(t.entities[l.id]).toBeUndefined();
    const hs = lines(t).filter((e) => Math.abs(t.points[e.p1].y) < 1e-9 && Math.abs(t.points[e.p2].y) < 1e-9);
    expect(hs).toHaveLength(2);
    const xs = hs.map((e) => [t.points[e.p1].x, t.points[e.p2].x].sort((a, b) => a - b));
    expect(xs).toEqual(expect.arrayContaining([[0, 10], [20, 30]]));
  });

  it('Trim: a line with no crossing is deleted; a circle crossed twice becomes an arc', () => {
    let s = createSketch('s', 'Sketch1', 'front');
    const [s1, l] = addLine(s, { x: 0, y: 0 }, { x: 10, y: 0 });
    expect(trimEntity(s1, l.id, { x: 5, y: 0 }).entityOrder).toHaveLength(0);
    const [s2, c] = addCircle(s, { x: 0, y: 0 }, 10);
    s = addLine(s2, { x: -20, y: 0 }, { x: 20, y: 0 })[0];
    const t = trimEntity(s, c.id, { x: 0, y: 10 });
    expect(t.entities[c.id]).toBeUndefined();
    const arcs = t.entityOrder.map((id) => t.entities[id]).filter((e): e is ArcEntity => e.kind === 'arc');
    expect(arcs).toHaveLength(1);
    // the upper half was clicked away: the arc runs through the bottom
    const { x, y } = t.points[arcs[0].start];
    expect(Math.hypot(x, y)).toBeCloseTo(10, 6);
    expect(t.points[arcs[0].start].y).toBeCloseTo(0, 3);
  });

  it('Sketch Fillet: two lines meeting at a corner get a tangent arc of the radius', () => {
    let s = createSketch('s', 'Sketch1', 'front');
    const [s1, a] = addLine(s, { x: 0, y: 0 }, { x: 20, y: 0 });
    const [s2, b] = addLine(s1, a.p2, { x: 20, y: 20 });
    s = s2;
    const r = sketchFillet(s, a.id, b.id, 5)!;
    expect(r).not.toBeNull();
    const t = r.sketch;
    const arc = t.entities[r.arcId] as ArcEntity;
    expect(t.scalars[arc.r]).toBeCloseTo(5, 6);
    expect(t.points[arc.center].x).toBeCloseTo(15, 6);
    expect(t.points[arc.center].y).toBeCloseTo(5, 6);
    const la = t.entities[a.id] as LineEntity, lb = t.entities[b.id] as LineEntity;
    expect(t.points[la.p2].x).toBeCloseTo(15, 6);
    expect(t.points[lb.p1].y).toBeCloseTo(5, 6);
    expect(t.constraintOrder.map((id) => t.constraints[id].kind).filter((k) => k === 'tangent')).toHaveLength(2);
  });

  it('Offset Entities: a rectangle offset outward by 2 is a 24 x 14 rectangle', () => {
    let s = createSketch('s', 'Sketch1', 'front');
    const [s1, l1] = addLine(s, { x: 0, y: 0 }, { x: 20, y: 0 });
    const [s2, l2] = addLine(s1, l1.p2, { x: 20, y: 10 });
    const [s3, l3] = addLine(s2, l2.p2, { x: 0, y: 10 });
    const [s4, l4] = addLine(s3, l3.p2, l1.p1);
    s = s4;
    // counter-clockwise rectangle: left = inside, so reverse for outward
    const t = offsetEntities(s, [l1.id, l2.id, l3.id, l4.id], 2, true);
    const newLines = lines(t).slice(4);
    expect(newLines).toHaveLength(4);
    const xs = newLines.flatMap((e) => [t.points[e.p1].x, t.points[e.p2].x]);
    const ys = newLines.flatMap((e) => [t.points[e.p1].y, t.points[e.p2].y]);
    expect(Math.min(...xs)).toBeCloseTo(-2, 6);
    expect(Math.max(...xs)).toBeCloseTo(22, 6);
    expect(Math.min(...ys)).toBeCloseTo(-2, 6);
    expect(Math.max(...ys)).toBeCloseTo(12, 6);
    // a circle offsets concentrically
    const [s5, c] = addCircle(s, { x: 50, y: 0 }, 5);
    const u = offsetEntities(s5, [c.id], 2);
    const circles = u.entityOrder.map((id) => u.entities[id]).filter((e): e is CircleEntity => e.kind === 'circle');
    expect(circles).toHaveLength(2);
    expect(u.scalars[circles[1].r]).toBeCloseTo(7, 6);
  });

  it('patterns and transforms copy or move the entities', () => {
    let s = createSketch('s', 'Sketch1', 'front');
    const [s1, c] = addCircle(s, { x: 0, y: 0 }, 2);
    s = s1;
    const lin = linearSketchPattern(s, [c.id], 10, 0, 3);
    expect(kinds(lin).filter((k) => k === 'circle')).toHaveLength(3);
    const circ = circularSketchPattern(s, [c.id], { x: 20, y: 0 }, 360, 4);
    expect(kinds(circ).filter((k) => k === 'circle')).toHaveLength(4);
    const centres = circ.entityOrder.map((id) => circ.entities[id] as CircleEntity).map((e) => circ.points[e.center]);
    expect(centres[2].x).toBeCloseTo(40, 6);
    const moved = transformEntities(s, [c.id], translate(5, 5));
    expect(moved.points[c.center]).toEqual({ x: 5, y: 5 });
    const rot = transformEntities(s, [c.id], rotateAbout({ x: 10, y: 0 }, 90));
    expect(rot.points[c.center].x).toBeCloseTo(10, 6);
    expect(rot.points[c.center].y).toBeCloseTo(-10, 6);
  });

  it('Convert Entities: polylines become lines, circles and arcs', () => {
    const s = createSketch('s', 'Sketch1', 'front');
    const circle = Array.from({ length: 32 }, (_, i) => ({ x: 5 + 3 * Math.cos((i / 32) * Math.PI * 2), y: 3 * Math.sin((i / 32) * Math.PI * 2) }));
    const arc = Array.from({ length: 9 }, (_, i) => ({ x: 20 + 4 * Math.cos((i / 8) * Math.PI), y: 4 * Math.sin((i / 8) * Math.PI) }));
    const t = convertPolylines(s, [{ points: [{ x: 0, y: 0 }, { x: 10, y: 0 }], closed: false }, { points: circle, closed: true }, { points: arc, closed: false }]);
    expect(kinds(t)).toEqual(['line', 'circle', 'arc']);
    const ce = t.entities[t.entityOrder[1]] as CircleEntity;
    expect(t.scalars[ce.r]).toBeCloseTo(3, 3);
    const ae = t.entities[t.entityOrder[2]] as ArcEntity;
    expect(t.points[ae.center].x).toBeCloseTo(20, 3);
    expect(t.scalars[ae.r]).toBeCloseTo(4, 3);
  });

  it('Sketch Chamfer cuts both lines back and joins them; Extend reaches the next entity', () => {
    let s = createSketch('s', 'Sketch1', 'front');
    const [s1, a] = addLine(s, { x: 0, y: 0 }, { x: 20, y: 0 });
    const [s2, b] = addLine(s1, a.p2, { x: 20, y: 20 });
    s = s2;
    const r = sketchChamfer(s, a.id, b.id, 5)!;
    expect(r).not.toBeNull();
    const t = r.sketch;
    const la = t.entities[a.id] as LineEntity, lb = t.entities[b.id] as LineEntity, ch = t.entities[r.lineId] as LineEntity;
    expect(t.points[la.p2].x).toBeCloseTo(15, 6);
    expect(t.points[lb.p1].y).toBeCloseTo(5, 6);
    expect([t.points[ch.p1], t.points[ch.p2]].map((p) => p.x + p.y).sort()).toEqual([15, 25]);
    // extend: a short line towards a vertical line reaches it
    let u = createSketch('s', 'Sketch1', 'front');
    const [u1, short] = addLine(u, { x: 0, y: 0 }, { x: 5, y: 0 });
    u = addLine(u1, { x: 30, y: -10 }, { x: 30, y: 10 })[0];
    const v = extendEntity(u, short.id, { x: 4, y: 0 });
    expect(v.points[(v.entities[short.id] as LineEntity).p2].x).toBeCloseTo(30, 6);
    // nothing to hit on the other side: unchanged
    expect(extendEntity(u, short.id, { x: 1, y: 0 })).toBe(u);
  });
});
