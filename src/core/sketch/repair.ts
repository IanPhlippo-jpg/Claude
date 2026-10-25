import type { Sketch } from './types';
import { addConstraint, entityPoints, removeEntity } from './model';

export interface SketchProblem {
  kind: 'gap' | 'overlap' | 'zero';
  label: string;
}

/**
 * Repair Sketch: end points closer than the gap tolerance are joined (moved together + Coincident), lines that
 * lie on top of each other are reduced to one, zero-length lines and arcs are removed.
 */
export function findSketchProblems(s: Sketch, gap = 0.05): SketchProblem[] {
  return repair(s, gap).problems;
}

export function repairSketch(s: Sketch, gap = 0.05): { sketch: Sketch; problems: SketchProblem[] } {
  return repair(s, gap);
}

function repair(s0: Sketch, gap: number): { sketch: Sketch; problems: SketchProblem[] } {
  let s = s0;
  const problems: SketchProblem[] = [];
  const P = (id: string) => s.points[id];
  // zero-length lines
  for (const id of [...s.entityOrder]) {
    const e = s.entities[id];
    if (e?.kind === 'line') {
      const a = P(e.p1), b = P(e.p2);
      if (Math.hypot(a.x - b.x, a.y - b.y) < 1e-9) {
        problems.push({ kind: 'zero', label: `Zero-length line ${id}` });
        s = removeEntity(s, id);
      }
    }
  }
  // duplicate (overlapping) lines with the same end points
  const seen = new Map<string, string>();
  const k = (x: number, y: number) => `${Math.round(x * 1e4)},${Math.round(y * 1e4)}`;
  for (const id of [...s.entityOrder]) {
    const e = s.entities[id];
    if (e?.kind !== 'line') continue;
    const a = P(e.p1), b = P(e.p2);
    const key = [k(a.x, a.y), k(b.x, b.y)].sort().join('|');
    if (seen.has(key)) {
      problems.push({ kind: 'overlap', label: `Overlapping lines ${seen.get(key)} / ${id}` });
      s = removeEntity(s, id);
    } else seen.set(key, id);
  }
  // gaps: free end points of different entities close together but not joined
  const coincident = new Set<string>();
  for (const cid of s.constraintOrder) {
    const c = s.constraints[cid];
    if (c.kind === 'coincident') coincident.add([...c.refs].sort().join('|'));
  }
  const ends: { pid: string; eid: string }[] = [];
  for (const eid of s.entityOrder) {
    const e = s.entities[eid];
    if (!e || e.construction || e.kind === 'point' || e.kind === 'circle' || e.kind === 'ellipse' || e.kind === 'text') continue;
    const pts = e.kind === 'arc' || e.kind === 'ellipseArc' || e.kind === 'conic' ? [e.start, e.end] : e.kind === 'spline' ? [e.points[0], e.points[e.points.length - 1]] : entityPoints(e);
    for (const pid of pts) ends.push({ pid, eid });
  }
  for (let i = 0; i < ends.length; i++) {
    for (let j = i + 1; j < ends.length; j++) {
      const a = ends[i], b = ends[j];
      if (a.eid === b.eid || a.pid === b.pid) continue;
      const pa = P(a.pid), pb = P(b.pid);
      if (!pa || !pb) continue;
      const d = Math.hypot(pa.x - pb.x, pa.y - pb.y);
      if (d > 1e-9 && d < gap && !coincident.has([a.pid, b.pid].sort().join('|'))) {
        problems.push({ kind: 'gap', label: `Gap of ${d.toFixed(4)} between ${a.eid} and ${b.eid}` });
        s = { ...s, points: { ...s.points, [b.pid]: { ...pa } } };
        s = addConstraint(s, 'coincident', [a.pid, b.pid])[0];
        coincident.add([a.pid, b.pid].sort().join('|'));
      }
    }
  }
  return { sketch: s, problems };
}
