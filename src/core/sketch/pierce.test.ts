import { describe, expect, it } from 'vitest';
import { createDocument } from '../document/types';
import { addLine, addPoint, createSketch } from './model';
import { piercePoints, refreshPierce } from './pierce';
import { solveSketch } from '../solver/solver';

describe('Pierce relation', () => {
  it('finds where a path of another sketch crosses the plane and holds the point there', () => {
    // a path on the Front plane going up through y = 0 at x = 12 (Top plane: y = 0)
    let path = createSketch('p', 'Path', 'front');
    path = addLine(path, { x: 12, y: -10 }, { x: 12, y: 30 })[0];
    let prof = createSketch('s', 'Profile', 'top');
    let pt;
    [prof, pt] = addPoint(prof, { x: 3, y: 4 });
    const doc = { ...createDocument('P'), sketches: { p: path, s: prof } };
    const hits = piercePoints(doc, prof);
    expect(hits.length).toBe(1);
    expect(hits[0].x).toBeCloseTo(12, 6);
    const id = 'pc';
    const pid = (pt as { p: string }).p;
    const k = { ...prof, constraints: { ...prof.constraints, [id]: { id, kind: 'pierce' as const, refs: [pid], pierce: { sketchId: 'p', entityId: hits[0].entityId } } }, constraintOrder: [...prof.constraintOrder, id] };
    const r = solveSketch(refreshPierce(doc, k));
    expect(r.sketch.points[pid].x).toBeCloseTo(12, 5);
  });
});
