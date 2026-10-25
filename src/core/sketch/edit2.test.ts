import { describe, expect, it } from 'vitest';
import { addConstraint, addLine, createSketch } from './model';
import { chainOf, circularSketchPattern, copyEntitiesKeep, dropOutsideRelations, sketchFillet, translate } from './edit';
import { solveSketch } from '../solver/solver';

describe('sketch tool options of the original', () => {
  it('Sketch Fillet > Keep constrained corners: the corner dimension moves to a virtual sharp', () => {
    let s = createSketch('s', 's', 'top');
    let a, b;
    [s, a] = addLine(s, { x: 0, y: 0 }, { x: 40, y: 0 });
    [s, b] = addLine(s, a.p2, { x: 40, y: 30 });
    s = addConstraint(s, 'distance', [a.p1, a.p2], { value: 40 })[0];
    const kept = sketchFillet(s, a.id, b.id, 5, true)!;
    expect(Object.values(kept.sketch.constraints).filter((c) => c.kind === 'distance').length).toBe(1);
    expect(solveSketch(kept.sketch).residual).toBeLessThan(1e-6);
    const dropped = sketchFillet(s, a.id, b.id, 5, false)!;
    expect(Object.values(dropped.sketch.constraints).filter((c) => c.kind === 'distance').length).toBe(0);
  });
  it('Offset > Select chain, Move > Keep relations off, Copy > Keep relations, circular Equal spacing off', () => {
    let s = createSketch('s', 's', 'top');
    let a, b, c;
    [s, a] = addLine(s, { x: 0, y: 0 }, { x: 10, y: 0 });
    [s, b] = addLine(s, a.p2, { x: 10, y: 10 });
    [s, c] = addLine(s, { x: 50, y: 0 }, { x: 60, y: 0 });
    expect(new Set(chainOf(s, [a.id]))).toEqual(new Set([a.id, b.id]));
    s = addConstraint(s, 'equal', [a.id, c.id])[0];
    s = addConstraint(s, 'perpendicular', [a.id, b.id])[0];
    expect(dropOutsideRelations(s, [a.id, b.id]).constraintOrder.length).toBe(1);
    const k = copyEntitiesKeep(s, [a.id, b.id], translate(0, 20));
    // the copy keeps the shared corner point and the perpendicular relation (not the equal to the line outside)
    expect(Object.values(k.constraints).filter((x) => x.kind === 'perpendicular').length).toBe(2);
    expect(k.entityOrder.length).toBe(5);
    const pts = Object.keys(k.points).length - Object.keys(s.points).length;
    expect(pts).toBe(3);
    const step = circularSketchPattern(s, [c.id], { x: 0, y: 0 }, 90, 3, false);
    const far = step.entityOrder.slice(-1).map((id) => step.entities[id] as { p1: string })[0];
    // two instances at 90 and 180 degrees: the last one lies on the negative x axis
    expect(step.points[far.p1].x).toBeCloseTo(-50, 6);
  });
});
