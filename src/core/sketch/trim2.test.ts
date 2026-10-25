import { describe, expect, it } from 'vitest';
import { addLine, createSketch } from './model';
import { cornerTrim, powerTrim, trimBetween, trimEntity } from './edit';

const lines = (s: ReturnType<typeof createSketch>) => Object.values(s.entities).filter((e) => e.kind === 'line') as { p1: string; p2: string; construction: boolean; id: string }[];

describe('Trim Entities modes', () => {
  it('Corner extends two lines to their meeting point', () => {
    let s = createSketch('s', 'S');
    let a, b;
    [s, a] = addLine(s, { x: 0, y: 0 }, { x: 10, y: 0 });
    [s, b] = addLine(s, { x: 20, y: 5 }, { x: 20, y: 30 });
    const r = cornerTrim(s, a.id, { x: 2, y: 0 }, b.id, { x: 20, y: 25 })!;
    expect(r.points[a.p2]).toEqual({ x: 20, y: 0 });
    expect(r.points[b.p1]).toEqual({ x: 20, y: 0 });
  });

  it('Trim away inside removes the part between two boundaries; outside keeps only it', () => {
    let s = createSketch('s', 'S');
    let h;
    [s, h] = addLine(s, { x: 0, y: 0 }, { x: 100, y: 0 });
    let b1, b2;
    [s, b1] = addLine(s, { x: 30, y: -10 }, { x: 30, y: 10 });
    [s, b2] = addLine(s, { x: 70, y: -10 }, { x: 70, y: 10 });
    const inside = trimBetween(s, h.id, [b1.id, b2.id], true);
    const keptIn = lines(inside).filter((l) => Math.abs(inside.points[l.p1].y) < 1e-9 && Math.abs(inside.points[l.p2].y) < 1e-9);
    expect(keptIn.length).toBe(2);
    const outside = trimBetween(s, h.id, [b1.id, b2.id], false);
    const keptOut = lines(outside).filter((l) => Math.abs(outside.points[l.p1].y) < 1e-9 && Math.abs(outside.points[l.p2].y) < 1e-9);
    expect(keptOut.length).toBe(1);
    expect(Math.abs(outside.points[keptOut[0].p2].x - outside.points[keptOut[0].p1].x)).toBeCloseTo(40, 6);
  });

  it('Power trim trims every entity the path crosses; Keep as construction keeps the piece', () => {
    let s = createSketch('s', 'S');
    let h;
    [s, h] = addLine(s, { x: 0, y: 0 }, { x: 100, y: 0 });
    [s] = addLine(s, { x: 50, y: -10 }, { x: 50, y: 10 });
    [s] = addLine(s, { x: 80, y: -10 }, { x: 80, y: 10 });
    const r = powerTrim(s, [{ x: 60, y: 5 }, { x: 70, y: -5 }]);
    // the horizontal line lost its piece between x = 50 and 80
    const hor = lines(r).filter((l) => Math.abs(r.points[l.p1].y) < 1e-9 && Math.abs(r.points[l.p2].y) < 1e-9);
    expect(hor.length).toBe(2);
    const kept = trimEntity(s, h.id, { x: 65, y: 0 }, { keepAsConstruction: true });
    expect(lines(kept).some((l) => l.construction)).toBe(true);
  });
});
