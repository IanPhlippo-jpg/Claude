import { describe, expect, it } from 'vitest';
import { addConstraint, addLine, addCircle, createSketch } from './model';
import { extractBlock, insertBlock } from './blocks';
import { solveSketch } from '../solver/solver';

describe('sketch blocks (design library)', () => {
  it('extracts a block with internal relations and re-inserts it elsewhere', () => {
    let s = createSketch('s', 'S');
    let a, b, c;
    [s, a] = addLine(s, { x: 10, y: 10 }, { x: 30, y: 10 });
    [s, b] = addLine(s, a.p2, { x: 30, y: 20 });
    [s, c] = addCircle(s, { x: 20, y: 15 }, 3);
    [s] = addConstraint(s, 'horizontal', [a.id]);
    [s] = addConstraint(s, 'perpendicular', [a.id, b.id]);
    [s] = addConstraint(s, 'length', [a.id], { value: 20 });
    [s] = addConstraint(s, 'coincident', [a.p1, s.origin]); // references the origin: must be dropped
    const block = extractBlock(s, [a.id, b.id, c.id]);
    expect(block.entities.length).toBe(3);
    expect(block.constraints.map((k) => k.kind).sort()).toEqual(['horizontal', 'length', 'perpendicular']);
    // centred on centroid
    const xs = Object.values(block.points).map((p) => p.x);
    expect(xs.reduce((x, y) => x + y, 0)).toBeCloseTo(0, 9);

    let target = createSketch('t', 'T');
    let ids;
    [target, ids] = insertBlock(target, block, { x: 100, y: 50 });
    expect(ids.length).toBe(3);
    expect(target.entityOrder.length).toBe(3);
    expect(target.constraintOrder.length).toBe(3);
    const r = solveSketch(target);
    expect(r.residual).toBeLessThan(1e-6);
    // inserted twice: ids stay unique
    [target] = insertBlock(target, block, { x: 0, y: 0 });
    expect(new Set(target.entityOrder).size).toBe(6);
    expect(solveSketch(target).residual).toBeLessThan(1e-6);
  });
});
