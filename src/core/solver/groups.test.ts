import { beforeEach, describe, expect, it } from 'vitest';
import { addArc, addCircle, addConstraint, addLine, addPoint, createSketch, lineLength, resetIds } from '../sketch/model';
import type { Sketch } from '../sketch/types';
import { countSolveGroups, solveSketch, solveSketchCached, type SolveResult } from './solver';

beforeEach(() => resetIds());

/** a plate with `n` holes, each with a diameter and its position from the origin (no relations between holes) */
function holePlate(n: number, dimensioned = true): { s: Sketch; ids: string[] } {
  let s = createSketch('s', 'Sketch1');
  const ids: string[] = [];
  for (let i = 0; i < n; i++) {
    const cx = 20 + (i % 30) * 25, cy = 20 + Math.floor(i / 30) * 25;
    let c;
    // start a little off the target so the solver has to move every hole
    [s, c] = addCircle(s, { x: cx + 0.7, y: cy - 0.4 }, 5.5);
    ids.push(c.id);
    if (!dimensioned) continue;
    [s] = addConstraint(s, 'diameter', [c.id], { value: 14 });
    [s] = addConstraint(s, 'hDistance', [s.origin, c.center], { value: cx });
    [s] = addConstraint(s, 'vDistance', [s.origin, c.center], { value: cy });
  }
  return { s, ids };
}

/** the analysis part of a result, for comparing the split solve with the joint one */
function verdict(r: SolveResult) {
  return { status: r.status, dof: r.dof, entityStatus: r.entityStatus, constraintStatus: r.constraintStatus, free: [...r.freePoints].sort() };
}

describe('solver: independent groups (P2-9)', () => {
  it('541 dimensioned holes solve as separate groups and are all fully defined', () => {
    const { s, ids } = holePlate(541);
    expect(countSolveGroups(s)).toBeGreaterThanOrEqual(541);
    const r = solveSketch(s);
    expect(r.status).toBe('full');
    expect(r.dof).toBe(0);
    expect(r.residual).toBeLessThan(1e-6);
    for (const id of ids) expect(r.entityStatus[id]).toBe('full');
    const c = r.sketch.entities[ids[540]] as { center: string; r: string };
    expect(r.sketch.points[c.center].x).toBeCloseTo(20 + (540 % 30) * 25, 6);
    expect(r.sketch.points[c.center].y).toBeCloseTo(20 + 18 * 25, 6);
    expect(r.sketch.scalars[c.r]).toBeCloseTo(7, 6);
  });

  it('500 free circles have 3 degrees of freedom each', () => {
    const { s, ids } = holePlate(500, false);
    // no equations on the circles: only the origin's two coordinates form parts
    expect(countSolveGroups(s)).toBe(2);
    const r = solveSketch(s);
    expect(r.status).toBe('under');
    expect(r.dof).toBe(1500);
    for (const id of ids) expect(r.entityStatus[id]).toBe('under');
  });

  it('one under-defined hole among fully defined ones is the only one reported under', () => {
    let { s, ids } = holePlate(40);
    let extra;
    [s, extra] = addCircle(s, { x: -50, y: -50 }, 3);
    [s] = addConstraint(s, 'radius', [extra.id], { value: 3 });
    const r = solveSketch(s);
    expect(r.status).toBe('under');
    expect(r.dof).toBe(2);
    expect(r.entityStatus[extra.id]).toBe('under');
    for (const id of ids) expect(r.entityStatus[id]).toBe('full');
  });

  it('a redundant and a conflicting dimension stay in their own hole', () => {
    let { s, ids } = holePlate(30);
    const c0 = s.entities[ids[3]] as { center: string };
    let red, con;
    [s, red] = addConstraint(s, 'hDistance', [s.origin, c0.center], { value: 20 + 3 * 25 });
    const r1 = solveSketch(s);
    expect(r1.status).toBe('over');
    expect(r1.constraintStatus[red.id]).toBe('redundant');
    expect(r1.entityStatus[ids[3]]).toBe('over');
    expect(r1.entityStatus[ids[4]]).toBe('full');
    [s, con] = addConstraint(s, 'vDistance', [s.origin, c0.center], { value: 99 });
    const r2 = solveSketch(s);
    expect(r2.status).toBe('conflict');
    expect(r2.constraintStatus[con.id]).toBe('conflicting');
    expect(r2.entityStatus[ids[4]]).toBe('full');
  });

  it('holes chained to each other form one group', () => {
    let s = createSketch('s', 'Sketch1');
    const cs = [];
    for (let i = 0; i < 6; i++) {
      let c;
      [s, c] = addCircle(s, { x: i * 10, y: 0 }, 2);
      cs.push(c);
      if (i > 0) [s] = addConstraint(s, 'hDistance', [cs[i - 1].center, c.center], { value: 10 });
    }
    // 6 circles linked in a chain: one group, plus the origin's two coordinates on their own
    expect(countSolveGroups(s)).toBe(3);
  });

  it('the split solve gives the same verdict as the joint solve on mixed sketches', () => {
    const sketches: Sketch[] = [];
    {
      // rectangle on the origin with a fixed corner added later, a hole pattern and a free arc
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
      [s] = addConstraint(s, 'length', [a.id], { value: 31 });
      // a Fix added after other relations on the same point: that point must not split the system
      [s] = addConstraint(s, 'fix', [b.p2]);
      [s] = addConstraint(s, 'parallel', [a.id, c.id]);
      for (let i = 0; i < 5; i++) {
        let h;
        [s, h] = addCircle(s, { x: 5 + i * 6, y: 8 }, 1);
        [s] = addConstraint(s, 'radius', [h.id], { value: 1.5 });
        if (i % 2 === 0) [s] = addConstraint(s, 'hDistance', [s.origin, h.center], { value: 5 + i * 6 });
        if (i === 4) [s] = addConstraint(s, 'radius', [h.id], { value: 1.5 });
      }
      [s] = addArc(s, { x: 50, y: 0 }, { x: 55, y: 0 }, { x: 50, y: 5 });
      let p;
      [s, p] = addPoint(s, { x: 70, y: 3 });
      [s] = addConstraint(s, 'fix', [p.id]);
      [s] = addConstraint(s, 'fix', [p.id]);
      sketches.push(s);
    }
    {
      // an arc on the origin (its internal rows touch the origin before the origin rows) and a conflict on the origin
      let s = createSketch('s', 'Sketch1');
      let arc, l;
      [s, arc] = addArc(s, { x: 0, y: 0 }, { x: 5, y: 0 }, { x: 0, y: 5 });
      [s] = addConstraint(s, 'coincident', [arc.center, s.origin]);
      [s] = addConstraint(s, 'radius', [arc.id], { value: 8 });
      [s, l] = addLine(s, { x: 20, y: 0 }, { x: 30, y: 0 });
      [s] = addConstraint(s, 'hDistance', [s.origin, l.p1], { value: 20 });
      [s] = addConstraint(s, 'hDistance', [s.origin, l.p1], { value: 25 });
      sketches.push(s);
    }
    for (const s of sketches) {
      const split = solveSketch(s);
      const joint = solveSketch(s, { joint: true });
      expect(verdict(split)).toEqual(verdict(joint));
      expect(split.residual).toBeCloseTo(joint.residual, 4);
    }
    expect(solveSketch(sketches[0]).status).toBe('over');
    expect(solveSketch(sketches[1]).status).toBe('conflict');
  });
});

describe('solver: robust rank (P3-7)', () => {
  /** a W x H rectangle on the origin with horizontal/vertical relations and two lengths */
  function rectangle(w: number, h: number) {
    let s = createSketch('s', 'Sketch1');
    let a, b, c, d;
    [s, a] = addLine(s, { x: 0, y: 0 }, { x: w * 0.97, y: 3 });
    [s, b] = addLine(s, a.p2, { x: w * 1.02, y: h * 0.95 });
    [s, c] = addLine(s, b.p2, { x: -2, y: h * 1.03 });
    [s, d] = addLine(s, c.p2, a.p1);
    [s] = addConstraint(s, 'horizontal', [a.id]);
    [s] = addConstraint(s, 'vertical', [b.id]);
    [s] = addConstraint(s, 'horizontal', [c.id]);
    [s] = addConstraint(s, 'vertical', [d.id]);
    [s] = addConstraint(s, 'coincident', [a.p1, s.origin]);
    [s] = addConstraint(s, 'length', [a.id], { value: w });
    [s] = addConstraint(s, 'length', [b.id], { value: h });
    return { s, a, b, c, d };
  }

  it('a 4000 mm rectangle is fully defined', () => {
    const { s, a, b, c, d } = rectangle(4000, 2000);
    const r = solveSketch(s);
    expect(r.status).toBe('full');
    expect(r.dof).toBe(0);
    for (const e of [a, b, c, d]) expect(r.entityStatus[e.id]).toBe('full');
    expect(lineLength(r.sketch, c)).toBeCloseTo(4000, 6);
  });

  it('a 4000 mm rectangle with redundant relations is over-defined on exactly those relations', () => {
    let { s, a, c, b, d } = rectangle(4000, 2000);
    let par, eq, perp;
    [s, par] = addConstraint(s, 'parallel', [a.id, c.id]);
    [s, eq] = addConstraint(s, 'equal', [a.id, c.id]);
    [s, perp] = addConstraint(s, 'perpendicular', [b.id, c.id]);
    const r = solveSketch(s);
    expect(r.status).toBe('over');
    expect(r.dof).toBe(0);
    expect(r.constraintStatus[par.id]).toBe('redundant');
    expect(r.constraintStatus[eq.id]).toBe('redundant');
    expect(r.constraintStatus[perp.id]).toBe('redundant');
    const others = s.constraintOrder.filter((id) => ![par.id, eq.id, perp.id].includes(id));
    for (const id of others) expect(r.constraintStatus[id]).toBe('ok');
    expect(r.entityStatus[d.id]).toBe('full');
  });

  it('mixed angle and length equations on a 4000 mm triangle', () => {
    let s = createSketch('s', 'Sketch1');
    let a, b, c;
    [s, a] = addLine(s, { x: 0, y: 0 }, { x: 3900, y: 5 });
    [s, b] = addLine(s, a.p2, { x: 2600, y: 2500 });
    [s, c] = addLine(s, b.p2, a.p1);
    [s] = addConstraint(s, 'coincident', [a.p1, s.origin]);
    [s] = addConstraint(s, 'horizontal', [a.id]);
    [s] = addConstraint(s, 'length', [a.id], { value: 4000 });
    [s] = addConstraint(s, 'angle', [a.id, b.id], { value: 120 });
    [s] = addConstraint(s, 'length', [b.id], { value: 3000 });
    const r1 = solveSketch(s);
    expect(r1.status).toBe('full');
    expect(r1.dof).toBe(0);
    for (const e of [a, b, c]) expect(r1.entityStatus[e.id]).toBe('full');
    const q = r1.sketch.points[b.p2];
    expect(q.x).toBeCloseTo(4000 - 1500, 4);
    expect(q.y).toBeCloseTo(3000 * Math.sin(Math.PI / 3), 4);
    // the third side's length follows from the others: adding it is redundant, adding an angle on it as well
    const len = Math.hypot(q.x, q.y);
    let lc, ang;
    [s, lc] = addConstraint(s, 'length', [c.id], { value: len });
    const angC = (Math.atan2(-q.y, -q.x) - Math.atan2(0, 1)) * (180 / Math.PI);
    [s, ang] = addConstraint(s, 'angle', [a.id, c.id], { value: angC });
    const r2 = solveSketch(s);
    expect(r2.status).toBe('over');
    expect(r2.constraintStatus[lc.id]).toBe('redundant');
    expect(r2.constraintStatus[ang.id]).toBe('redundant');
    expect(r2.dof).toBe(0);
  });

  it('a 4000 mm rectangle without its height has exactly one degree of freedom', () => {
    let s = createSketch('s', 'Sketch1');
    let a, b, c, d;
    [s, a] = addLine(s, { x: 0, y: 0 }, { x: 3990, y: 0 });
    [s, b] = addLine(s, a.p2, { x: 3990, y: 2000 });
    [s, c] = addLine(s, b.p2, { x: 0, y: 2000 });
    [s, d] = addLine(s, c.p2, a.p1);
    for (const [k, e] of [['horizontal', a], ['vertical', b], ['horizontal', c], ['vertical', d]] as const) [s] = addConstraint(s, k, [e.id]);
    [s] = addConstraint(s, 'coincident', [a.p1, s.origin]);
    [s] = addConstraint(s, 'length', [a.id], { value: 4000 });
    // the angle between a horizontal and a vertical line is already known: redundant, and the height stays free
    [s] = addConstraint(s, 'angle', [a.id, b.id], { value: 90 });
    const r = solveSketch(s);
    expect(r.status).toBe('over');
    expect(r.dof).toBe(1);
    expect(r.entityStatus[a.id]).toBe('over');
    expect(r.entityStatus[c.id]).toBe('under');
    expect(r.entityStatus[d.id]).toBe('under');
  });

  it('a redundant angle at 120 degrees on 4000 mm lines is found while the sketch stays under-defined', () => {
    let s = createSketch('s', 'Sketch1');
    let a, b, c;
    [s, a] = addLine(s, { x: 0, y: 0 }, { x: 4000, y: 0 });
    [s, b] = addLine(s, a.p2, { x: 2000, y: 3464 });
    [s, c] = addLine(s, { x: 6000, y: 100 }, { x: 4000, y: 3564 });
    [s] = addConstraint(s, 'coincident', [a.p1, s.origin]);
    [s] = addConstraint(s, 'horizontal', [a.id]);
    [s] = addConstraint(s, 'length', [a.id], { value: 4000 });
    [s] = addConstraint(s, 'angle', [a.id, b.id], { value: 120 });
    [s] = addConstraint(s, 'parallel', [b.id, c.id]);
    let ang;
    [s, ang] = addConstraint(s, 'angle', [a.id, c.id], { value: 120 });
    const r = solveSketch(s);
    expect(r.status).toBe('over');
    expect(r.constraintStatus[ang.id]).toBe('redundant');
    // b: its length is free (1); c: position (2) and length (1)
    expect(r.dof).toBe(4);
    expect(r.entityStatus[b.id]).toBe('under');
    expect(r.entityStatus[c.id]).toBe('over');
  });
});

describe('solver: second-order folds and the cache', () => {
  it('a horizontal dimension to the end of a level, dimensioned line still fixes its rotation', () => {
    let s = createSketch('s', 'Sketch1');
    let l, h2;
    [s, l] = addLine(s, { x: 10, y: 0 }, { x: 30, y: 0 });
    [s] = addConstraint(s, 'length', [l.id], { value: 20 });
    [s] = addConstraint(s, 'hDistance', [s.origin, l.p1], { value: 10 });
    // first order the new row equals the length row (both along x); at second order it allows only angle 0
    [s, h2] = addConstraint(s, 'hDistance', [s.origin, l.p2], { value: 30 });
    const r = solveSketch(s);
    expect(r.status).toBe('under');
    expect(r.constraintStatus[h2.id]).toBe('ok');
    // only the vertical position is left
    expect(r.dof).toBe(1);
  });

  it('a truly redundant row on an under-defined line stays redundant', () => {
    let s = createSketch('s', 'Sketch1');
    let l, red;
    [s, l] = addLine(s, { x: 10, y: 0 }, { x: 30, y: 4 });
    [s] = addConstraint(s, 'length', [l.id], { value: 20 });
    [s, red] = addConstraint(s, 'distance', [l.p1, l.p2], { value: 20 });
    const r = solveSketch(s);
    expect(r.status).toBe('over');
    expect(r.constraintStatus[red.id]).toBe('redundant');
    expect(r.dof).toBe(3);
  });

  it('solveSketchCached returns the remembered result for the same sketch object and for its solved sketch', () => {
    const { s } = holePlate(20);
    const r = solveSketchCached(s);
    expect(solveSketchCached(s)).toBe(r);
    expect(solveSketchCached(r.sketch)).toBe(r);
    const fresh = solveSketch(r.sketch);
    expect(verdict(fresh)).toEqual(verdict(r));
  });
});
